/**
 * Alineaciones en el Worker (port de robot/alineaciones.py) CON THROTTLE.
 *
 * Por que aca y no en GitHub Actions: el cron de Actions corria 1 vez por hora
 * (pegado al minuto :00), asi que un partido que empieza "en punto" recibia su
 * alineacion JUSTO al pitazo o despues -> inutil. El Worker corre cada 1 min y
 * es confiable, asi que apenas Highlightly publica el lineup (~T-60) lo tenemos.
 *
 * CLAVE DE CUOTA: cada intento gasta 1 llamada a HL, AUNQUE vuelva vacio. Por eso
 * NO preguntamos cada minuto a lo bruto (serian ~30 intentos vacios por partido).
 * Auto-regulacion (mismo estilo que detectarTramos/enriquecer):
 *   - VENTANA: solo partidos cuyo kickoff cae en [ahora+? ... ] -> desde
 *     VENTANA_MIN_PRE antes del inicio hasta VENTANA_POST despues. Fuera de eso,
 *     0 requests. (Pre-partido: las alineaciones no aportan una vez empezado.)
 *   - FLAG NATURAL: solo partidos con alineaciones IS NULL. Apenas se cargan,
 *     dejan de consultarse para siempre.
 *   - THROTTLE: solo cada PASO_MIN minutos (no cada minuto) -> ~3-5 intentos
 *     vacios por partido antes de que HL publique. Gasto ~3-6 llamadas/partido,
 *     similar al cron viejo pero con frescura real.
 *
 * Reusa hlGet / buscarMatchId / LimiteDiario de enriquecer.js (DRY).
 */

import { LimiteDiario, buscarMatchId, hlGet } from "./enriquecer.js";

// Minutos ANTES del inicio en que empezamos a buscar (HL publica ~T-60; con 75
// damos colchon sin desperdiciar muchos intentos vacios).
const VENTANA_MIN_PRE = 75;
// Minutos DESPUES del inicio que seguimos intentando (pequena gracia: si HL
// publico tarde, mejor tenerla a los 5 min que nunca). Pasado esto, ya no aporta.
const VENTANA_POST = 10;
// Cada cuantos minutos intentamos (throttle). 5 = ~3-5 intentos antes de T-60.
const PASO_MIN = 5;

function _jugador(j) {
  return {
    nombre: (j.name || "").trim(),
    numero: j.number ?? null,
    posicion: j.position ?? null,
    id: j.id ?? null,
  };
}

// initialLineup viene como lista de lineas (lista de listas). Tolera forma plana.
function _lineas(initial) {
  if (!Array.isArray(initial)) return [];
  if (initial.length && Array.isArray(initial[0])) {
    return initial.map((linea) => linea.map(_jugador));
  }
  return [initial.map(_jugador)];
}

function _equipo(eq) {
  if (!eq || typeof eq !== "object") return null;
  return {
    formacion: eq.formation ?? null,
    titulares: _lineas(eq.initialLineup),
    suplentes: (eq.substitutes || []).map(_jugador),
  };
}

// GET /lineups/{id} -> {local, visita} normalizado, o null si HL aun no publico.
async function alineacionesDesdeHl(env, matchId) {
  let data = await hlGet(env, `/lineups/${matchId}`);
  if (data && typeof data === "object" && !("homeTeam" in data) && "data" in data) {
    data = data.data;
  }
  if (!data || typeof data !== "object") return null;
  const local = _equipo(data.homeTeam);
  const visita = _equipo(data.awayTeam);
  if (!local && !visita) return null;
  const vacio = (e) => !e || (!e.titulares.length && !e.suplentes.length);
  if (vacio(local) && vacio(visita)) return null; // HL todavia no lo publico
  return { local, visita };
}

function enVentana(p, ahoraMs) {
  const k = p.fecha ? new Date(p.fecha).getTime() : NaN;
  if (Number.isNaN(k)) return false;
  const desde = k - VENTANA_MIN_PRE * 60e3;
  const hasta = k + VENTANA_POST * 60e3;
  return ahoraMs >= desde && ahoraMs <= hasta;
}

/**
 * Punto de entrada: lo llama el cron del Worker (index.js) tras el ciclo vivo.
 * Carga alineaciones de los partidos en ventana pre-partido sin gastar de mas.
 */
export async function cargarAlineaciones(supa, env, log, cacheFecha = {}) {
  if (!env.HL_KEY) {
    log.push("  alineaciones: sin HL_KEY configurado, omitido.");
    return;
  }

  // Throttle: solo cada PASO_MIN minutos -> evita ~30 intentos vacios/partido.
  if (new Date().getMinutes() % PASO_MIN !== 0) return;

  const sinAlin = await supa.get("partidos", {
    alineaciones: "is.null",
    select: "id,equipo_local,equipo_visita,fecha,highlightly_id",
    order: "fecha.asc",
  });
  const ahora = Date.now();
  const pend = sinAlin.filter((p) => enVentana(p, ahora));
  if (!pend.length) return; // ningun partido en ventana -> 0 requests a HL

  log.push(`Alineaciones: ${pend.length} partido(s) en ventana.`);
  let hechos = 0;
  for (const p of pend) {
    const etiqueta = `${p.equipo_local} vs ${p.equipo_visita}`;
    try {
      const mid = await buscarMatchId(env, supa, p, cacheFecha, log);
      if (mid === null) continue;
      const al = await alineacionesDesdeHl(env, mid);
      if (al === null) {
        log.push(`  [${etiqueta}] HL aun no publica alineacion. Reintento luego.`);
        continue;
      }
      await supa.patch("partidos", { id: `eq.${p.id}` }, { alineaciones: al });
      hechos += 1;
      const fl = (al.local || {}).formacion;
      const fv = (al.visita || {}).formacion;
      log.push(`  [${etiqueta}] OK alineacion  local ${fl} / visita ${fv}`);
    } catch (e) {
      if (e instanceof LimiteDiario) {
        log.push("  alineaciones: limite diario HL (100/dia). Sigo en la proxima corrida.");
        break;
      }
      log.push(`  [${etiqueta}] ERROR alineacion: ${e.message}`);
    }
  }
  log.push(`Alineaciones: ${hechos} cargada(s).`);
}
