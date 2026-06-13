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
import { enriquecerPendientes } from "./enriquecer.js";

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
async function actualizarPartido(supa, p, m, log) {
  const nuevoEstado = derivarEstado(m);

  // Salvaguarda 0: un partido NO puede ponerse en vivo/final ANTES de su hora
  // de inicio. worldcup26 a veces manda finished=true (o live) para partidos
  // que aun no empiezan -> los dariamos por terminados y se sumarian puntos
  // falsos. Bug encontrado 2026-06-12 (Paraguay vs USA dado por final 0-0
  // antes del pitazo). Damos 2 min de gracia por desfases de reloj.
  const kickoff = p.fecha ? new Date(p.fecha).getTime() : NaN;
  if (!Number.isNaN(kickoff) && Date.now() < kickoff - 2 * 60e3 && nuevoEstado !== "programado") {
    log.push(`  IGNORADO (API=${nuevoEstado} pero aun no empieza, kickoff=${p.fecha}): ${p.equipo_local} vs ${p.equipo_visita}`);
    return null;
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

  const body = { estado: nuevoEstado };
  // Salvaguarda 2: no escribir null encima de un valor real.
  if (home !== null) body.goles_local = home;
  if (away !== null) body.goles_visita = away;
  if (nuevoEstado === "final") {
    body.minuto = null;
    // Sellar finalizado_at SOLO la primera vez (transicion a final). Si lo
    // re-escribieramos cada minuto, la "gracia" de 20 min del enriquecedor
    // (enriquecer.py) nunca se cumpliria y Highlightly jamas correria.
    // Bug encontrado 2026-06-12 al pasar el robot vivo a cron de 1 min.
    if (!p.finalizado_at) body.finalizado_at = new Date().toISOString();
  }

  // Cronometro (worldcup26 no da el minuto numerico):
  //  a) Si el feed manda el tramo (h1/h2) -> anclamos 1'/46' una sola vez. Si
  //     ademas manda 'hf' en el descanso, derivarEstado lo pasa a entretiempo
  //     y el reloj se detiene solo (RelojVivo solo tickea en vivo/alargue).
  //  b) Si solo dice "live" (caso real 2026, sin h1/h2/hf) -> Opcion B:
  //     - 1er ciclo en vivo = PITAZO REAL: anclamos en 1' (minuto_at = ahora),
  //       asi el reloj parte del pitazo y no de la hora programada (que solia
  //       ir varios min adelantada).
  //     - Tras 60' de reloj de pared (45' de juego + 15' de descanso asumido)
  //       reanclamos en 46' para arrancar el 2do tiempo (~exacto sin gastar API).
  //     RelojVivo (front) anima los segundos entre ciclos y se topa en 45'/90'.
  // El minuto_at lo pone solo el trigger trg_anclar_minuto al cambiar 'minuto'.
  const tramo = String(m.time_elapsed || "").trim().toLowerCase();
  const DESCANSO_MS = 60 * 60000; // 45' jugados + 15' de entretiempo asumido
  if (tramo === "h1" && p.minuto == null) {
    body.minuto = 1; // 1er tiempo (tope del reloj = 45')
  } else if (tramo === "h2" && (p.minuto == null || p.minuto < 46)) {
    body.minuto = 46; // 2do tiempo (tope del reloj sube a 90')
  } else if (nuevoEstado === "en_vivo" && tramo !== "h1" && tramo !== "h2") {
    const minutoAt = p.minuto_at ? new Date(p.minuto_at).getTime() : NaN;
    if (p.minuto == null) {
      body.minuto = 1; // primera vez en vivo = pitazo real
    } else if (
      p.minuto < 46 &&
      !Number.isNaN(minutoAt) &&
      Date.now() - minutoAt >= DESCANSO_MS
    ) {
      body.minuto = 46; // arranca el 2do tiempo (descanso de 15' asumido)
    }
    // si no, no tocamos minuto: RelojVivo lo anima solo desde el ancla.
  }

  await supa.patch("partidos", { id: `eq.${p.id}` }, body);
  return nuevoEstado;
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
      const estado = await actualizarPartido(supa, p, m, log);
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

  // Enriquecimiento Highlightly (HT/FT) en el mismo cron. Se auto-regula:
  // si no hay candidatos en entretiempo/final, no le pega a Highlightly.
  try {
    await enriquecerPendientes(supa, env, log);
  } catch (e) {
    log.push(`enriquecer FATAL: ${e.message}`);
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
