/**
 * Robot EN VIVO: worldcup26.ir -> Supabase, como Cloudflare Worker.
 *
 * Por que existe: el cron de GitHub Actions se estrangula/salta corridas en
 * horas de alta carga (un Mundial) y no sirve para frescura de ~1 min. Este
 * Worker corre en el edge de Cloudflare cada 1 min de forma confiable.
 *
 * Es un PORT 1:1 de robot/actualizar.py + robot/comun.py. Mantiene TODAS las
 * salvaguardas: no degradar estado, no pisar valores reales con null, y
 * preservar los datos que el admin cargo a mano (asistencia/penal/autogol).
 *
 * Highlightly (asistencias/tarjetas/stats post-partido) SIGUE en GitHub Actions:
 * no necesita frescura, corre al final del partido.
 *
 * Secretos del Worker (wrangler secret put ...):
 *   SUPABASE_URL          -> https://TUPROYECTO.supabase.co
 *   SUPABASE_SERVICE_KEY  -> service_role key (bypassea RLS)
 *   TRIGGER_SECRET        -> token para disparar a mano via GET ?key=...
 */

import { comoBool, comoInt, makeSupa, nuestroNombre } from "./comun.js";
import { enriquecerPendientes, detectarTramos, hlConfirmaArranque } from "./enriquecer.js";
import { cargarAlineaciones } from "./alineaciones.js";

const API_URL = "https://worldcup26.ir/get/games";

const ESTADOS_VIVOS = new Set(["en_vivo", "entretiempo", "alargue", "penales"]);

// Prioridad de estado: nunca degradamos un partido. Si la DB ya dice en_vivo y
// la API trae programado, ignoramos (cubre delays del feed y ediciones a mano).
const PRIORIDAD_ESTADO = {
  programado: 0, suspendido: 0,
  en_vivo: 1, entretiempo: 1,
  alargue: 2, penales: 3,
  final: 4,
};

// EQUIPOS, nuestroNombre, comoInt, comoBool y makeSupa viven en comun.js
// (compartidos con enriquecer.js), igual que robot/comun.py.

// ------------------------------------------------------------------ helpers
function derivarEstado(m) {
  if (comoBool(m.finished)) return "final";
  // Estado a partir de time_elapsed de worldcup26 (mismo esquema que el feed
  // del autor para 2022): notstarted | h1 | hf | h2 | finished.
  // h1/h2 -> en_vivo | hf -> entretiempo | finished -> final.
  const t = String(m.time_elapsed || "").trim().toLowerCase();
  switch (t) {
    case "h1":
    case "h2":
    case "live": // compat por si el feed manda 'live' en algun momento
      return "en_vivo";
    case "hf":
      return "entretiempo";
    case "finished":
      return "final";
    default: // notstarted y cualquier otro -> programado
      return "programado";
  }
}

// "J. Quiñones 9'" | "F. Balogun 45'+5'" | "G. Reyna 90'+8'" | "J. Doe 90+3'"
// Captura: 1=nombre, 2=minuto base, 3=descuento (opcional).
const RE_GOLEADOR = /^\s*(.+?)\s+(\d+)\s*'?\s*(?:\+\s*(\d+)\s*'?)?\s*$/;

function parsearScorers(crudo) {
  if (crudo === null || crudo === undefined) return [];
  let s = String(crudo).trim();
  if (!s || s.toLowerCase() === "null" || s === "{}" || s === "{ }") return [];
  s = s.replace(/^[{\s]+|[}\s]+$/g, ""); // quita llaves/espacios de los extremos
  // normalizar comillas tipograficas a comilla doble/simple estandar
  s = s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const crudos = s.split(/"\s*,\s*"/);
  const salida = [];
  for (let c of crudos) {
    c = c.trim().replace(/^"|"$/g, "").trim();
    if (!c) continue;
    // Autogol y penal: worldcup26 los marca junto al nombre con "(OG)" / "(p)".
    // Ej: "D. Bobadilla 7'(OG)" | "Breel Embolo 17' (p)". Los detectamos y los
    // quitamos del nombre antes de matchear el minuto.
    const esAutogol = /\(og\)/i.test(c);
    const esPenal = /\(p\)/i.test(c);
    c = c.replace(/\(og\)/i, "").replace(/\(p\)/i, "").replace(/\s{2,}/g, " ").trim();
    const mm = c.match(RE_GOLEADOR);
    if (!mm) continue;
    const adicional = mm[3] ? Number(mm[3]) : null; // descuento (45+5 -> 5)
    salida.push([mm[1].trim(), Number(mm[2]), adicional, esAutogol, esPenal]);
  }
  return salida;
}

function localDateIso(s) {
  const mm = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!mm) return null;
  return `${mm[3]}-${mm[1].padStart(2, "0")}-${mm[2].padStart(2, "0")}`;
}

function relevanteParaHoy(m) {
  const iso = localDateIso(m.local_date);
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00Z`).getTime();
  const now = new Date();
  const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.abs((d - hoy) / 86400000) <= 1;
}

// ------------------------------------------------------- auto-gatillo (ventana)
async function hayTrabajo(supa) {
  const vivos = await supa.get("partidos", {
    estado: "in.(en_vivo,entretiempo,alargue,penales)", select: "id", limit: "1",
  });
  if (vivos.length) return true;

  const ahora = Date.now();
  const lo = new Date(ahora - 3 * 3600e3).toISOString();
  const hi = new Date(ahora + 20 * 60e3).toISOString();
  const proximos = await supa.get("partidos", {
    estado: "eq.programado", and: `(fecha.gte.${lo},fecha.lte.${hi})`, select: "id", limit: "1",
  });
  if (proximos.length) return true;

  const desde = new Date(ahora - 12 * 3600e3).toISOString();
  const recien = await supa.get("partidos", {
    estado: "eq.final", finalizado_at: `gte.${desde}`, select: "id", limit: "1",
  });
  return recien.length > 0;
}

// ------------------------------------------------------------------ worldcup26
async function apiGetJuegos() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(API_URL, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`worldcup26 ${r.status}`);
    const data = await r.json();
    return Array.isArray(data) ? data : (data.games || []);
  } finally {
    clearTimeout(t);
  }
}

// --------------------------------------------------------------------- matching
async function buscarPartido(supa, m, log) {
  const apiId = comoInt(m.id);
  if (apiId !== null) {
    const filas = await supa.get("partidos", { api_fixture_id: `eq.${apiId}`, select: "*" });
    if (filas.length) return filas[0];
  }

  const home = m.home_team_name_en || "";
  const away = m.away_team_name_en || "";
  const local = nuestroNombre(home);
  const visita = nuestroNombre(away);
  if (!local || !visita) {
    const faltan = [];
    if (!local) faltan.push(`'${home}'`);
    if (!visita) faltan.push(`'${away}'`);
    log.push(`  SIN MAPEAR (${faltan.join(", ")}): ${home} vs ${away} -- agregar a EQUIPOS`);
    return null;
  }

  const fechaApi = localDateIso(m.local_date);
  const filas = await supa.get("partidos", {
    equipo_local: `eq.${local}`, equipo_visita: `eq.${visita}`, select: "*",
  });
  for (const p of filas) {
    if (fechaApi && String(p.fecha).slice(0, 10) === fechaApi) {
      if (apiId !== null) await supa.patch("partidos", { id: `eq.${p.id}` }, { api_fixture_id: apiId });
      return p;
    }
  }
  if (filas.length === 1) {
    if (apiId !== null) await supa.patch("partidos", { id: `eq.${filas[0].id}` }, { api_fixture_id: apiId });
    return filas[0];
  }
  return null;
}

// ------------------------------------------------------------- actualizaciones
async function actualizarPartido(supa, p, m, env, cacheFecha, log) {
  let nuevoEstado = derivarEstado(m);

  // Caso LAG de worldcup26: ya paso la hora de inicio pero la API sigue diciendo
  // 'notstarted' (feed lento). Sin esto el partido se queda 'programado' sin en
  // vivo ni goles aunque ya se este jugando. Bug real 2026-06-15. DESEMPATE con
  // Highlightly: si HL confirma que ya esta en curso, forzamos en_vivo. Damos 2
  // min de gracia tras la hora programada para no adelantarnos a un kickoff justo.
  if (nuevoEstado === "programado" && p.estado === "programado") {
    const kickoffMs = p.fecha ? new Date(p.fecha).getTime() : NaN;
    if (!Number.isNaN(kickoffMs) && Date.now() > kickoffMs + 2 * 60e3) {
      const fechaApiIso = localDateIso(m.local_date);
      const confirmado = await hlConfirmaArranque(env, supa, p, fechaApiIso, cacheFecha, log);
      if (confirmado === "en_curso") {
        nuevoEstado = "en_vivo";
        log.push(`  LAG worldcup26: HL confirma en curso pese a 'notstarted'. Arranco ${p.equipo_local} vs ${p.equipo_visita}`);
      }
    }
  }

  // Salvaguarda 0: un partido NO puede ponerse en vivo/final ANTES de su hora
  // de inicio. worldcup26 a veces manda finished=true (o live) para partidos
  // que aun no empiezan -> los dariamos por terminados y se sumarian puntos
  // falsos. Bug encontrado 2026-06-12 (Paraguay vs USA dado por final 0-0
  // antes del pitazo). Damos 2 min de gracia por desfases de reloj.
  let fechaCorregida = null;
  const kickoff = p.fecha ? new Date(p.fecha).getTime() : NaN;
  if (!Number.isNaN(kickoff) && Date.now() < kickoff - 2 * 60e3 && nuevoEstado !== "programado") {
    // La API dice vivo/terminado pero la 'fecha' de la DB esta en el futuro:
    // o la HORA CARGADA ESTA MAL (ej. AM/PM, bug Australia-Turquia 2026-06-14)
    // o worldcup26 manda un falso 'finished' antes del pitazo (Paraguay-USA).
    // DESEMPATE con Highlightly (segunda fuente): si HL CONFIRMA que ya esta
    // en curso, la fecha esta mal -> autocorregimos a 'ahora' y arrancamos.
    // Si HL dice que no arranco (o no hay certeza), respetamos la guarda.
    const fechaApiIso = localDateIso(m.local_date);
    const confirmado = await hlConfirmaArranque(env, supa, p, fechaApiIso, cacheFecha, log);
    if (confirmado === "en_curso") {
      fechaCorregida = new Date().toISOString();
      log.push(`  FECHA CORREGIDA: HL confirma en curso, ${p.equipo_local} vs ${p.equipo_visita}. fecha ${p.fecha} -> ahora`);
    } else {
      log.push(`  !!! HORA SOSPECHOSA: API dice '${nuevoEstado}' pero la DB cree que aun no empieza (kickoff=${p.fecha}) y HL no confirma (${confirmado ?? "sin certeza"}). REVISAR/CORREGIR la fecha de: ${p.equipo_local} vs ${p.equipo_visita}`);
      return null;
    }
  }

  // Salvaguarda 1: no degradar el estado.
  const prioDb = PRIORIDAD_ESTADO[p.estado || ""] ?? 0;
  const prioApi = PRIORIDAD_ESTADO[nuevoEstado] ?? 0;
  if (prioApi < prioDb) {
    log.push(`  saltado (API=${nuevoEstado} retrocederia '${p.estado}'): ${p.equipo_local} vs ${p.equipo_visita}`);
    return null;
  }

  const home = comoInt(m.home_score);
  const away = comoInt(m.away_score);

  // worldcup26 manda 'live' tanto en 1er tiempo, entretiempo COMO 2do tiempo
  // (no los distingue). El DUENO de la transicion en_vivo<->entretiempo<->2T es
  // Highlightly (ver detectarTramos en enriquecer.js, que usa state.description
  // = "Half time" / "In Progress"). Por eso: si la DB ya esta en 'entretiempo'
  // y worldcup26 dice 'en_vivo', NO pisamos el estado (esperamos que HL confirme
  // el 2do tiempo). Asi el cartel de Entretiempo no parpadea de vuelta a vivo.
  const mantenerET = p.estado === "entretiempo" && nuevoEstado === "en_vivo";

  const body = {};
  if (fechaCorregida) body.fecha = fechaCorregida; // hora mal cargada, confirmada por HL
  if (!mantenerET) body.estado = nuevoEstado;
  // Salvaguarda 2: no escribir null encima de un valor real.
  if (home !== null) body.goles_local = home;
  if (away !== null) body.goles_visita = away;

  if (nuevoEstado === "final") {
    body.tramo = null; // se acabo: sin etiqueta de tramo
    // Un partido FINAL siempre tiene marcador: si llega a final y no hay numero
    // (ni en la API ni en la DB), es 0:0. Sin esto, un 0:0 donde worldcup26
    // manda score=null se queda en NULL y el panel admin muestra "-:-" en vez
    // de "0:0" (bug RD Congo, 2026-06-21).
    if (home === null && p.goles_local == null) body.goles_local = 0;
    if (away === null && p.goles_visita == null) body.goles_visita = 0;
    // Sellar finalizado_at SOLO la primera vez (transicion a final). Si lo
    // re-escribieramos cada minuto, la "gracia" de 15 min del enriquecedor
    // nunca se cumpliria y Highlightly jamas correria.
    if (!p.finalizado_at) body.finalizado_at = new Date().toISOString();
  } else if (nuevoEstado === "en_vivo" && !mantenerET && !p.tramo) {
    // Primer ciclo en vivo => arranca el 1er tiempo. Los pasos a 'ET' y '2T'
    // los marca Highlightly en detectarTramos (worldcup26 no los distingue).
    // tramo_at ancla las ventanas de deteccion al momento REAL (no a la hora
    // programada), asi un kickoff tardio no rompe la deteccion del 2do tiempo.
    body.tramo = "1T";
    body.tramo_at = new Date().toISOString();
  }

  await supa.patch("partidos", { id: `eq.${p.id}` }, body);
  return mantenerET ? "entretiempo" : nuevoEstado;
}

async function sincronizarGoles(supa, p, m, log) {
  const parsed = [];
  for (const [j, min, adic, og, pen] of parsearScorers(m.home_scorers))
    parsed.push([j, min, adic, "local", og, pen]);
  for (const [j, min, adic, og, pen] of parsearScorers(m.away_scorers))
    parsed.push([j, min, adic, "visita", og, pen]);

  if (!parsed.length) return; // la API no asegura goles -> no tocamos nada

  const existentes = await supa.get("partido_eventos", {
    partido_id: `eq.${p.id}`, tipo: "eq.gol",
    select: "equipo,minuto,minuto_adicional,asistencia,detalle",
  });
  const manual = new Map();
  for (const e of existentes) {
    // clave equipo|minuto|adicional para no chocar dos goles del mismo descuento
    manual.set(`${e.equipo}|${e.minuto}|${e.minuto_adicional ?? ""}`, {
      asistencia: e.asistencia ?? null,
      detalle: e.detalle || "normal",
    });
  }

  const filas = [];
  const vistos = new Set();
  for (const [jugador, minuto, adicional, equipo, esAutogol, esPenal] of parsed) {
    const k = `${jugador}|${minuto}|${adicional ?? ""}|${equipo}`;
    if (vistos.has(k)) continue; // la API a veces repite
    vistos.add(k);
    const prev = manual.get(`${equipo}|${minuto}|${adicional ?? ""}`) || {};
    // Prioridad del detalle: autogol > penal (de la API) > lo del admin > normal.
    const detalle = esAutogol
      ? "autogol"
      : esPenal
      ? "penal"
      : (prev.detalle ?? "normal");
    filas.push({
      partido_id: p.id,
      tipo: "gol",
      equipo,
      minuto,
      minuto_adicional: adicional, // descuento (45+5 -> 5); null si no hubo
      jugador, // nombre correcto de la API
      asistencia: prev.asistencia ?? null, // preservado del admin
      detalle, // autogol detectado o lo preservado del admin
    });
  }

  await supa.del("partido_eventos", { partido_id: `eq.${p.id}`, tipo: "eq.gol" });
  await supa.insert("partido_eventos", filas);
  log.push(`  ${filas.length} gol(es) sincronizados en ${p.equipo_local} vs ${p.equipo_visita}`);
}

// ------------------------------------------------------------------------ main
async function correr(env, log) {
  const supa = makeSupa(env);

  if (!(await hayTrabajo(supa))) {
    log.push("No hay partidos en vivo, por empezar ni finalizados hace poco. Sin requests a la API.");
    return;
  }

  const todos = await apiGetJuegos();
  const relevantes = todos.filter(relevanteParaHoy);
  log.push(`Partidos totales: ${todos.length} | relevantes hoy +/-1d: ${relevantes.length}`);

  // Cache de listas de HL por fecha, COMPARTIDO en todo el ciclo: el desempate
  // de arranque, detectarTramos y enriquecer reusan la misma respuesta -> una
  // sola llamada a HL por fecha aunque varias funciones la necesiten.
  const cacheFecha = {};

  for (const m of relevantes) {
    let p;
    try {
      p = await buscarPartido(supa, m, log);
    } catch (e) {
      log.push(`  error matching: ${e.message}`);
      continue;
    }
    if (!p) continue;
    try {
      const estado = await actualizarPartido(supa, p, m, env, cacheFecha, log);
      if (estado === null) continue;
      if (ESTADOS_VIVOS.has(estado) || estado === "final") {
        try {
          await sincronizarGoles(supa, p, m, log);
        } catch (e) {
          log.push(`  goles fallaron para partido ${p.id}: ${e.message}`);
        }
      }
      log.push(`  OK ${p.equipo_local} vs ${p.equipo_visita} -> ${estado}`);
    } catch (e) {
      log.push(`  fallo ${p.equipo_local} vs ${p.equipo_visita}: ${e.message}`);
    }
  }

  // Deteccion de tramo (entretiempo / 2do tiempo) via Highlightly. Se auto-regula:
  // solo pega a HL si hay un partido en la ventana de descanso (~35-80 min) que
  // aun no confirmo el 2do tiempo, y solo en minutos pares.
  try {
    await detectarTramos(supa, env, log, cacheFecha);
  } catch (e) {
    log.push(`tramos FATAL: ${e.message}`);
  }

  // Enriquecimiento Highlightly (HT/FT) en el mismo cron. Se auto-regula:
  // si no hay candidatos en entretiempo/final, no le pega a Highlightly.
  try {
    await enriquecerPendientes(supa, env, log, cacheFecha);
  } catch (e) {
    log.push(`enriquecer FATAL: ${e.message}`);
  }

  // Alineaciones (pre-partido) en el mismo cron. Se auto-regula: solo cada N
  // min, solo partidos sin alineacion en ventana pre-partido. Reusa cacheFecha
  // (la lista de HL por fecha) para no duplicar la llamada /matches?date.
  try {
    await cargarAlineaciones(supa, env, log, cacheFecha);
  } catch (e) {
    log.push(`alineaciones FATAL: ${e.message}`);
  }

  log.push("Listo.");
}

export default {
  // Cron: corre cada 1 min (ver wrangler.toml).
  async scheduled(event, env, ctx) {
    const log = [];
    try {
      await correr(env, log);
    } catch (e) {
      log.push(`FATAL: ${e.message}`);
    }
    for (const l of log) console.log(l);
  },

  // Disparo manual para probar: GET https://<worker>/?key=TRIGGER_SECRET
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!env.TRIGGER_SECRET || url.searchParams.get("key") !== env.TRIGGER_SECRET) {
      return new Response("No autorizado. Usa ?key=TRIGGER_SECRET", { status: 403 });
    }
    const log = [];
    try {
      await correr(env, log);
    } catch (e) {
      log.push(`FATAL: ${e.message}`);
    }
    return new Response(log.join("\n") + "\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
