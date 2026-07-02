/**
 * Enriquecedor Highlightly como parte del Worker (port de robot/enriquecer.py).
 *
 * Corre en el MISMO cron de 1 min que el robot en vivo (index.js). Se
 * auto-regula con flags en la DB para no repetir llamadas a Highlightly:
 *   - HT (entretiempo): 1 llamada -> datos del 1er tiempo. Flag: enriquecido_ht_at
 *   - FT (final, +gracia): 1 llamada -> datos completos. Flag: enriquecido_at
 *
 * Highlightly free = 100 req/dia; ~2 llamadas x partido sobra de lejos.
 *
 * Secreto extra del Worker:  wrangler secret put HL_KEY
 */

import { comoInt, nuestroNombre } from "./comun.js";
import { huboTanda } from "./hl-map.js";

const HL_BASE = "https://soccer.highlightly.net";
const LEAGUE_ID = 1635;
const SEASON = 2026;

// Minutos de gracia tras el pitazo final antes de enriquecer (HL tarda en
// cerrar stats). El HT no necesita gracia: HL publica el 1er tiempo rapido.
const MIN_GRACIA_FT = 15;

// type de Highlightly -> nuestro tipo de evento. 'Substitution' = cambio:
// jugador=quien entra (player), asistencia=quien sale (substituted).
const TIPO_HL = {
  "Goal": "gol",
  "Penalty": "gol",
  "Yellow Card": "amarilla",
  "Red Card": "roja",
  "Substitution": "cambio",
};

export class LimiteDiario extends Error {}

// ------------------------------------------------------------------ Highlightly
export async function hlGet(env, path, params) {
  const qs = params
    ? "?" + Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    : "";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${HL_BASE}${path}${qs}`, {
      headers: { "x-rapidapi-key": env.HL_KEY },
      signal: ctrl.signal,
    });
    if (r.status === 429) throw new LimiteDiario();
    if (!r.ok) throw new Error(`Highlightly ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

async function hlListarPorFecha(env, fechaIso) {
  const data = await hlGet(env, "/matches", {
    leagueId: LEAGUE_ID, season: SEASON, date: fechaIso,
  });
  if (Array.isArray(data)) return data;
  return (data && data.data) || [];
}

// Devuelve el objeto-partido sin importar como lo envuelva Highlightly.
function desempacar(d) {
  if (Array.isArray(d)) return d.length ? d[0] : null;
  if (d && typeof d === "object") {
    if ("data" in d && !("events" in d) && !("statistics" in d)) {
      return desempacar(d.data);
    }
    return d;
  }
  return null;
}

export async function hlDetalle(env, matchId) {
  const d = await hlGet(env, `/matches/${matchId}`);
  const obj = desempacar(d);
  return obj && typeof obj === "object" ? obj : null;
}

// DEBUG TEMPORAL (quitar tras la migracion a solo-HL): devuelve el JSON CRUDO
// de HL para inspeccionar la estructura real (campos de marcador, estados). Se
// invoca desde el handler fetch del worker, gateado por TRIGGER_SECRET.
//   ?debug=lista&date=YYYY-MM-DD   -> /matches?leagueId&season&date
//   ?debug=detalle&id=<matchId>    -> /matches/{id}
//   ?debug=cuota                   -> headers de rate-limit (cuanto queda/reset)
// Consulta cuota: hace 1 llamada minima y devuelve status + TODOS los headers
// de rate-limit que exponga HL/RapidAPI (limit, remaining, reset). El header
// 'reset' revela si el reinicio es por calendario (timestamp fijo) o rolling.
export async function hlCuota(env) {
  const r = await fetch(
    `${HL_BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&date=2026-07-01`,
    { headers: { "x-rapidapi-key": env.HL_KEY } }
  );
  const rate = {};
  const todos = {};
  for (const [k, v] of r.headers) {
    todos[k] = v;
    if (/limit|remaining|reset|quota|rate/i.test(k)) rate[k] = v;
  }
  return { status: r.status, ahora_iso: new Date().toISOString(), rate_limit: rate, todos_headers: todos };
}

export async function debugHl(env, tipo, arg) {
  if (tipo === "detalle") return hlGet(env, `/matches/${arg}`);
  if (tipo === "cuota") return hlCuota(env);
  return hlGet(env, "/matches", { leagueId: LEAGUE_ID, season: SEASON, date: arg });
}

// ----------------------------------------------------------------- candidatos
function fechaUtc(p) {
  const iso = String(p.fecha || "").replace("Z", "+00:00");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function buscarMatchId(env, supa, p, cacheFecha, log) {
  if (p.highlightly_id) return comoInt(p.highlightly_id);

  const f = fechaUtc(p);
  if (f === null) return null;
  if (!(f in cacheFecha)) cacheFecha[f] = await hlListarPorFecha(env, f);

  for (const m of cacheFecha[f]) {
    const home = nuestroNombre((m.homeTeam || {}).name);
    const away = nuestroNombre((m.awayTeam || {}).name);
    if (home === p.equipo_local && away === p.equipo_visita) {
      const mid = comoInt(m.id);
      if (mid !== null) {
        await supa.patch("partidos", { id: `eq.${p.id}` }, { highlightly_id: mid });
      }
      return mid;
    }
  }
  const sin = cacheFecha[f].map(
    (m) => `${(m.homeTeam || {}).name} vs ${(m.awayTeam || {}).name}`
  );
  log.push(`  SIN MATCH en HL (${f}) para ${p.equipo_local} vs ${p.equipo_visita}. HL trae: ${sin.join(", ") || "nada"}`);
  return null;
}

// ----------------------------------------------------------------- enriquecer
// Clasifica un evento de HL. Distingue penal convertido de FALLADO ("Missed
// Penalty"), y marca autogol. Devuelve null para tipos que no nos interesan
// (incluido "VAR Goal Cancelled", que NO debe contar como gol).
//   { tipo, autogol, penal, fallado }
function tipoEvento(ev) {
  const raw = String(ev.type || "");
  if (/own\s*goal/i.test(raw)) return { tipo: "gol", autogol: true, penal: false, fallado: false };
  // OJO: "Missed Penalty" debe chequearse ANTES que /penalty/ (que lo matchea).
  if (/missed\s*penalty/i.test(raw)) return { tipo: "gol", autogol: false, penal: true, fallado: true };
  if (/penalty/i.test(raw)) return { tipo: "gol", autogol: false, penal: true, fallado: false };
  const t = TIPO_HL[ev.type];
  if (!t) return null;
  const og =
    ev.ownGoal === true || ev.own_goal === true ||
    /\(og\)/i.test(String(ev.player || ""));
  return { tipo: t, autogol: t === "gol" && og, penal: false, fallado: false };
}

export async function eventosDesdeHl(detalle, p, supa) {
  const homeId = comoInt((detalle.homeTeam || {}).id);
  const conTanda = huboTanda(detalle.state || {});
  const lado = (ev) => {
    const nombre = nuestroNombre((ev.team || {}).name);
    if (nombre && nombre === p.equipo_local) return "local";
    if (nombre && nombre === p.equipo_visita) return "visita";
    const tid = comoInt((ev.team || {}).id);
    return homeId !== null && tid === homeId ? "local" : "visita";
  };

  // Preservar 'detalle' (penal/autogol) por (equipo, minuto, adicional): si el
  // robot en vivo o el admin ya lo marcaron, no lo perdemos.
  const previos = await supa.get("partido_eventos", {
    partido_id: `eq.${p.id}`, tipo: "eq.gol",
    select: "equipo,minuto,minuto_adicional,detalle",
  });
  const detalleManual = new Map();
  for (const e of previos) {
    detalleManual.set(
      `${e.equipo}|${e.minuto}|${e.minuto_adicional ?? ""}`,
      e.detalle || "normal"
    );
  }

  const filas = [];
  let ordenTanda = 0; // orden global de ejecucion de la tanda (1,2,3...)
  for (const ev of detalle.events || []) {
    const info = tipoEvento(ev);
    if (!info) continue;
    // HL manda el minuto como string aparte: "9" | "45+5" | "90+2" | "120+1".
    const partesTiempo = String(ev.time ?? "").split("+");
    const minuto = comoInt(partesTiempo[0]) || 0;
    const adicional = partesTiempo.length > 1 ? comoInt(partesTiempo[1]) : null;
    const equipo = lado(ev);
    let jugador = (ev.player || "").trim() || null;
    if (jugador) {
      jugador = jugador.replace(/\(og\)/i, "").replace(/\s{2,}/g, " ").trim() || null;
    }

    // --- PENAL DE TANDA: solo si el partido se definio por penales y el penal
    //     (convertido o fallado) ocurre en el minuto 120+. NO cuenta como gol
    //     ni para el goleo: va como tipo 'penal_tanda'. El orden se guarda en
    //     'minuto' (1,2,3...) para reconstruir la secuencia en el frontend. ---
    if (conTanda && info.penal && minuto >= 120) {
      ordenTanda += 1;
      filas.push({
        partido_id: p.id, tipo: "penal_tanda", equipo,
        minuto: ordenTanda, minuto_adicional: null,
        jugador, asistencia: null,
        detalle: info.fallado ? "fallado" : "convertido",
      });
      continue;
    }

    // --- Penal FALLADO en juego: no es gol, no cuenta para nada. Se ignora. ---
    if (info.fallado) continue;

    let asistencia = null;
    let det = null;
    if (info.tipo === "gol") {
      asistencia = (ev.assist || "").trim() || null;
      const manual = detalleManual.get(`${equipo}|${minuto}|${adicional ?? ""}`);
      // Prioridad: autogol > penal (de HL) > lo del admin/robot > normal.
      det = info.autogol ? "autogol" : info.penal ? "penal" : (manual ?? "normal");
    } else if (info.tipo === "cambio") {
      asistencia = (ev.substituted || "").trim() || null;
    }
    filas.push({
      partido_id: p.id, tipo: info.tipo, equipo, minuto,
      minuto_adicional: adicional, jugador, asistencia, detalle: det,
    });
  }
  return filas;
}

function statsDesdeHl(detalle, p) {
  const bloques = detalle.statistics || [];
  if (!bloques.length) return null;

  const homeId = comoInt((detalle.homeTeam || {}).id);
  const lado = (team) => {
    const nombre = nuestroNombre((team || {}).name);
    if (nombre && nombre === p.equipo_local) return "local";
    if (nombre && nombre === p.equipo_visita) return "visita";
    const tid = comoInt((team || {}).id);
    return homeId !== null && tid === homeId ? "local" : "visita";
  };

  const salida = {};
  for (const bloque of bloques) {
    const equipo = lado(bloque.team || {});
    const valores = {};
    for (const s of bloque.statistics || []) {
      if (s.displayName != null) valores[s.displayName] = s.value;
    }
    salida[equipo] = valores;
  }
  if (!Object.keys(salida).length) return null;
  if (detalle.topPlayers) salida.top_players = detalle.topPlayers;
  return salida;
}

async function enriquecerPartido(env, supa, p, cacheFecha, log) {
  const sinHacer = { hizoAlgo: false, eventosCompletos: false };
  const mid = await buscarMatchId(env, supa, p, cacheFecha, log);
  if (mid === null) return sinHacer;

  const detalle = await hlDetalle(env, mid);
  if (!detalle) {
    log.push(`  HL sin detalle match ${mid} (${p.equipo_local} vs ${p.equipo_visita})`);
    return sinHacer;
  }

  const filas = await eventosDesdeHl(detalle, p, supa);
  return aplicarEventosYStats(supa, p, detalle, filas, log);
}

// Escribe eventos (goles/asist/tarjetas/cambios) y estadisticas desde un detalle
// de HL ya obtenido. Recibe las FILAS ya parseadas (eventosDesdeHl) para no
// re-parsear: las comparte con actualizarDesdeHL (derivacion del 90'). Reutilizable
// por el enriquecido HT/FT Y por el flujo EN VIVO (migracion a solo-HL).
export async function aplicarEventosYStats(supa, p, detalle, filas, log) {
  let hizoAlgo = false;

  // --- Eventos (goles+asist, tarjetas, cambios). HL manda: borra+reinserta. ---
  // GUARDA anti-pisado-parcial: solo reemplazamos los eventos si HL trae al menos
  // tantos goles como el marcador. Si la lista de HL viene corta (caso lluvia:
  // stats listas pero timeline aun incompleto), NO pisamos los del feed en vivo y
  // dejamos el partido sin marcar para reintentar. Asi no perdemos goles ni se
  // congelan nombres abreviados (bug Mbappe 2026: K. Mbappe vs Kylian Mbappe).
  const golesHl = filas.filter((f) => f.tipo === "gol").length;
  const golesReales = (p.goles_local ?? 0) + (p.goles_visita ?? 0);
  const eventosCompletos = golesHl >= golesReales;

  if (eventosCompletos && filas.length) {
    await supa.del("partido_eventos", { partido_id: `eq.${p.id}` });
    await supa.insert("partido_eventos", filas);
    hizoAlgo = true;
    const n = (t) => filas.filter((f) => f.tipo === t).length;
    const asist = filas.filter((f) => f.tipo === "gol" && f.asistencia).length;
    log.push(`  OK eventos ${p.equipo_local} vs ${p.equipo_visita}: ${n("gol")} gol(es) (${asist} con asist.), ${n("amarilla")} amarilla(s), ${n("roja")} roja(s), ${n("cambio")} cambio(s)`);
  } else if (!eventosCompletos) {
    log.push(`  HL eventos INCOMPLETOS (${golesHl}/${golesReales} goles) ${p.equipo_local} vs ${p.equipo_visita}: no piso, reintento luego`);
  } else {
    log.push(`  HL sin eventos para ${p.equipo_local} vs ${p.equipo_visita} (no se tocan eventos)`);
  }

  // --- Estadisticas (panel del detalle) ---
  const stats = statsDesdeHl(detalle, p);
  if (stats) {
    await supa.patch("partidos", { id: `eq.${p.id}` }, { estadisticas: stats });
    hizoAlgo = true;
    log.push(`  OK stats ${p.equipo_local} vs ${p.equipo_visita}: ${Object.keys(stats.local || {}).length} metricas/equipo`);
  }

  return { hizoAlgo, eventosCompletos };
}

// Partidos a enriquecer: FT (final + gracia, sin enriquecido_at),
// HT (entretiempo, sin enriquecido_ht_at) y
// 2T (arranco el 2do tiempo, sin enriquecido_2t_at) -> trae asist/tarjetas del
// 1er tiempo a Detalles, que HL suele tener vacias durante el entretiempo.
async function candidatos(supa) {
  const out = [];
  const ahora = Date.now();
  const corteFt = new Date(ahora - MIN_GRACIA_FT * 60e3).toISOString();
  const ft = await supa.get("partidos", {
    estado: "eq.final",
    enriquecido_at: "is.null",
    finalizado_at: `lte.${corteFt}`,
    select: "*",
    order: "fecha.asc",
  });
  for (const p of ft) {
    const finMs = p.finalizado_at ? new Date(p.finalizado_at).getTime() : 0;
    const minsFin = finMs ? (ahora - finMs) / 60000 : 999;
    // Ventana fresca (~primeros 25 min tras la gracia): intenta cada ciclo.
    // Despues, los reintentos (por eventos HL incompletos) van solo cada 5 min
    // para cuidar la cuota de Highlightly (100/dia).
    if (minsFin > 25 && new Date().getMinutes() % 5 !== 0) continue;
    out.push({ p, fase: "ft" });
  }

  const ht = await supa.get("partidos", {
    estado: "eq.entretiempo",
    enriquecido_ht_at: "is.null",
    select: "*",
    order: "fecha.asc",
  });
  for (const p of ht) out.push({ p, fase: "ht" });

  // 2T: 3 min de gracia tras arrancar el 2do tiempo (HL ya publico el 1er tiempo).
  const corte2t = new Date(Date.now() - 3 * 60e3).toISOString();
  const t2 = await supa.get("partidos", {
    estado: "eq.en_vivo",
    tramo: "eq.2T",
    enriquecido_2t_at: "is.null",
    tramo_at: `lte.${corte2t}`,
    select: "*",
    order: "fecha.asc",
  });
  for (const p of t2) out.push({ p, fase: "2t" });

  return out;
}

// ------------------------------------- confirmacion de arranque (desempate)
// Segunda fuente para la guarda "HORA SOSPECHOSA" de index.js: cuando worldcup26
// dice que un partido esta en vivo/final pero su 'fecha' en la DB todavia esta en
// el futuro (hora mal cargada), le preguntamos a Highlightly. Si HL CONFIRMA que
// ya esta en curso, sabemos que la fecha esta mal (no es un falso 'finished' de
// worldcup26) y se puede arrancar el partido con confianza.
//
// Costo: 1 llamada a la LISTA de HL por fecha, y reusa cacheFecha -> casi siempre
// 0 llamadas extra. Solo se invoca en el caso atascado (raro), no en cada arranque.
//
// Devuelve: "en_curso" | "no_arranco" | null (sin certeza: sin key, 429, no esta).
const DESC_EN_CURSO = new Set([
  "in progress", "half time", "added time", "break time", "extra time",
  "penalties", "finished", "after extra time", "after penalties",
]);
const DESC_NO_ARRANCO = new Set([
  "not started", "scheduled", "to be defined", "postponed", "cancelled",
]);

export async function hlConfirmaArranque(env, supa, p, fechaIso, cacheFecha, log) {
  if (!env.HL_KEY) return null;
  const f = fechaIso || fechaUtc(p);
  if (!f) return null;
  if (!(f in cacheFecha)) {
    try {
      cacheFecha[f] = await hlListarPorFecha(env, f);
    } catch (e) {
      if (e instanceof LimiteDiario) {
        log.push("  arranque: limite diario HL (100/dia), no puedo confirmar.");
        return null;
      }
      log.push(`  arranque: fallo lista HL (${f}): ${e.message}`);
      cacheFecha[f] = [];
      return null;
    }
  }
  const item = (cacheFecha[f] || []).find((m) => {
    if (p.highlightly_id && comoInt(m.id) === comoInt(p.highlightly_id)) return true;
    const home = nuestroNombre((m.homeTeam || {}).name);
    const away = nuestroNombre((m.awayTeam || {}).name);
    return home === p.equipo_local && away === p.equipo_visita;
  });
  if (!item) return null; // HL no lo tiene -> sin certeza, respeta la guarda
  // De paso, cacheamos el highlightly_id si lo encontramos por nombres.
  const mid = comoInt(item.id);
  if (mid !== null && !p.highlightly_id) {
    await supa.patch("partidos", { id: `eq.${p.id}` }, { highlightly_id: mid });
    p.highlightly_id = mid;
  }
  const desc = String((item.state || {}).description || "").trim().toLowerCase();
  if (DESC_EN_CURSO.has(desc)) return "en_curso";
  if (DESC_NO_ARRANCO.has(desc)) return "no_arranco";
  return null; // descripcion desconocida -> sin certeza
}

// ------------------------------------------------- deteccion de tramo (HT/2T)
// worldcup26 NO distingue entretiempo (manda 'live' en 1T, ET y 2T). Highlightly
// SI: state.description = "Half time" / "In Progress". La LISTA de HL ya trae ese
// state por partido => 1 llamada por fecha da el estado de todos.
//
// ROBUSTEZ (bug 2026: partido pegado en entretiempo o en 1er tiempo):
//  - Las ventanas se anclan a 'tramo_at' (momento REAL en que se fijo el tramo),
//    NO a la hora programada -> inmune a kickoffs tardios / descuentos largos.
//  - Fallback DURO sin HL en AMBAS transiciones, aunque Highlightly nunca diga
//    "Half time"/"In Progress" (ej. se quedo sin cuota 100/dia). Imposible quedar
//    pegado:
//      * 1T -> ET: si lleva >=55 min en 1er tiempo (45' + descuento holgado).
//      * ET -> 2T: si lleva >=18 min en entretiempo.
//  - HL solo afina/acelera: ventana [35,80] min (1T->ET) y [8,18] min (ET->2T)
//    desde tramo_at, en minutos pares.
const T1_MAX_MIN = 55; // 1er tiempo maximo asumido antes de forzar el entretiempo
const ET_MAX_MIN = 18; // descanso maximo asumido antes de forzar el 2do tiempo

export async function detectarTramos(supa, env, log, cacheFecha = {}) {
  const vivos = await supa.get("partidos", {
    estado: "in.(en_vivo,entretiempo)",
    select: "id,equipo_local,equipo_visita,fecha,estado,tramo,tramo_at,highlightly_id",
  });
  if (!vivos.length) return;

  const ahora = Date.now();
  const minsDesdeTramo = (p) => {
    const t = p.tramo_at ? new Date(p.tramo_at).getTime() : NaN;
    return Number.isNaN(t) ? null : (ahora - t) / 60000;
  };

  // --- Fallback DURO 1T->ET (sin HL, sin throttle): 1er tiempo >=55 min -> ET.
  // Cubre el caso de HL sin cuota: sin esto, un partido podia quedar clavado en
  // 1er tiempo para siempre (no llegaba a ET ni a 2T). Bug real 2026-06-15.
  for (const p of vivos) {
    if (p.tramo !== "1T") continue;
    const m = minsDesdeTramo(p);
    if (m !== null && m >= T1_MAX_MIN) {
      await supa.patch("partidos", { id: `eq.${p.id}` }, {
        estado: "entretiempo", tramo: "ET", tramo_at: new Date().toISOString(),
      });
      log.push(`  TRAMO: ${p.equipo_local} vs ${p.equipo_visita} -> ENTRETIEMPO (fallback ${Math.round(m)}min)`);
      p.tramo = "ET"; // permite que el fallback ET->2T lo siga evaluando luego
      p.tramo_at = new Date().toISOString();
      p.estado = "entretiempo";
    }
  }

  // --- Fallback DURO ET->2T (sin HL, sin throttle): entretiempo >=18 min -> 2do tiempo.
  for (const p of vivos) {
    if (p.tramo !== "ET") continue;
    const m = minsDesdeTramo(p);
    if (m !== null && m >= ET_MAX_MIN) {
      await supa.patch("partidos", { id: `eq.${p.id}` }, {
        estado: "en_vivo", tramo: "2T", tramo_at: new Date().toISOString(),
      });
      log.push(`  TRAMO: ${p.equipo_local} vs ${p.equipo_visita} -> 2do TIEMPO (fallback ${Math.round(m)}min)`);
      p.tramo = "2T"; // evita re-evaluarlo abajo
    }
  }

  if (!env.HL_KEY) return;

  // --- Deteccion via Highlightly (mas rapida/precisa que el fallback).
  const pend = vivos.filter((p) => {
    const m = minsDesdeTramo(p);
    if (m === null) return false;
    if (p.tramo === "1T") return m >= 35 && m <= 80; // ventana de descanso (1T->ET)
    if (p.tramo === "ET") return m >= 8 && m <= ET_MAX_MIN; // arranque 2do tiempo
    return false; // 2T (o sin tramo) no necesita HL
  });
  if (!pend.length) return; // fuera de ventana -> 0 requests a HL

  // Throttle: solo minutos pares (cada 2 min) -> ~la mitad de llamadas.
  if (new Date().getMinutes() % 2 !== 0) return;

  for (const p of pend) {
    const f = fechaUtc(p);
    if (f === null) continue;
    if (!(f in cacheFecha)) {
      try {
        cacheFecha[f] = await hlListarPorFecha(env, f);
      } catch (e) {
        if (e instanceof LimiteDiario) {
          log.push("  tramos: limite diario HL (100/dia), omito.");
          return;
        }
        log.push(`  tramos: fallo lista HL (${f}): ${e.message}`);
        cacheFecha[f] = [];
      }
    }
    const item = (cacheFecha[f] || []).find((m) => {
      if (p.highlightly_id && comoInt(m.id) === comoInt(p.highlightly_id)) return true;
      const home = nuestroNombre((m.homeTeam || {}).name);
      const away = nuestroNombre((m.awayTeam || {}).name);
      return home === p.equipo_local && away === p.equipo_visita;
    });
    if (!item) continue;
    const desc = String((item.state || {}).description || "").trim().toLowerCase();
    const stamp = new Date().toISOString();

    if (p.tramo === "1T" && desc === "half time") {
      await supa.patch("partidos", { id: `eq.${p.id}` }, {
        estado: "entretiempo", tramo: "ET", tramo_at: stamp,
      });
      log.push(`  TRAMO: ${p.equipo_local} vs ${p.equipo_visita} -> ENTRETIEMPO (HL)`);
    } else if (p.tramo === "ET" && desc === "in progress") {
      await supa.patch("partidos", { id: `eq.${p.id}` }, {
        estado: "en_vivo", tramo: "2T", tramo_at: stamp,
      });
      log.push(`  TRAMO: ${p.equipo_local} vs ${p.equipo_visita} -> 2do TIEMPO (HL)`);
    }
  }
}

// Punto de entrada: lo llama el cron del Worker (index.js) tras el ciclo vivo.
export async function enriquecerPendientes(supa, env, log, cacheFecha = {}) {
  if (!env.HL_KEY) {
    log.push("  enriquecer: sin HL_KEY configurado, omitido.");
    return;
  }

  const lista = await candidatos(supa);
  if (!lista.length) return; // nada pendiente -> cero requests a Highlightly

  log.push(`Enriquecer: ${lista.length} candidato(s) (HT/FT).`);
  // Tope para dejar de reintentar el FT de un partido cuyos eventos HL nunca
  // completa; si no, reintentariamos hasta el corte de 12h de hayTrabajo.
  const FT_TIMEOUT_MIN = 180;
  let hechos = 0;
  for (const { p, fase } of lista) {
    try {
      const { hizoAlgo, eventosCompletos } = await enriquecerPartido(
        env, supa, p, cacheFecha, log
      );
      if (!hizoAlgo) continue;

      if (fase === "ft") {
        // FT: solo damos por enriquecido si los eventos quedaron completos. Si
        // HL aun viene corto (caso lluvia), NO marcamos -> se reintenta el
        // proximo ciclo, salvo que ya haya pasado el tope (ahi marcamos igual).
        const finMs = p.finalizado_at ? new Date(p.finalizado_at).getTime() : 0;
        const vencio = finMs && (Date.now() - finMs) / 60000 >= FT_TIMEOUT_MIN;
        if (!eventosCompletos && !vencio) continue;
        if (!eventosCompletos && vencio) {
          log.push(`  FT ${p.equipo_local} vs ${p.equipo_visita}: eventos sin completar tras ${FT_TIMEOUT_MIN}min, marco igual`);
        }
        await supa.patch("partidos", { id: `eq.${p.id}` }, { enriquecido_at: new Date().toISOString() });
        hechos += 1;
      } else {
        // HT / 2T: intermedios, se marcan siempre (no alimentan goleadores y la
        // ventana se cierra sola al cambiar de estado).
        const campo = fase === "ht" ? "enriquecido_ht_at" : "enriquecido_2t_at";
        await supa.patch("partidos", { id: `eq.${p.id}` }, { [campo]: new Date().toISOString() });
        hechos += 1;
      }
    } catch (e) {
      if (e instanceof LimiteDiario) {
        log.push(`  Limite diario de Highlightly (100/dia). Corto; sigo luego. Hechos: ${hechos}`);
        break;
      }
      log.push(`  fallo enriquecer ${p.equipo_local} vs ${p.equipo_visita}: ${e.message}`);
    }
  }
  log.push(`Enriquecer listo: ${hechos}.`);
}
