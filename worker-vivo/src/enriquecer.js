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

class LimiteDiario extends Error {}

// ------------------------------------------------------------------ Highlightly
async function hlGet(env, path, params) {
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

async function hlDetalle(env, matchId) {
  const d = await hlGet(env, `/matches/${matchId}`);
  const obj = desempacar(d);
  return obj && typeof obj === "object" ? obj : null;
}

// ----------------------------------------------------------------- candidatos
function fechaUtc(p) {
  const iso = String(p.fecha || "").replace("Z", "+00:00");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function buscarMatchId(env, supa, p, cacheFecha, log) {
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
// Detecta el tipo de evento de HL, marcando autogol cuando corresponde.
function tipoEvento(ev) {
  const raw = String(ev.type || "");
  if (/own\s*goal/i.test(raw)) return { tipo: "gol", autogol: true, penal: false };
  if (/penalty/i.test(raw)) return { tipo: "gol", autogol: false, penal: true };
  const t = TIPO_HL[ev.type];
  if (!t) return null;
  const og =
    ev.ownGoal === true || ev.own_goal === true ||
    /\(og\)/i.test(String(ev.player || ""));
  return { tipo: t, autogol: t === "gol" && og, penal: false };
}

async function eventosDesdeHl(detalle, p, supa) {
  const homeId = comoInt((detalle.homeTeam || {}).id);
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
  for (const ev of detalle.events || []) {
    const info = tipoEvento(ev);
    if (!info) continue;
    // HL manda el minuto como string aparte: "9" | "45+5" | "90+2".
    const partesTiempo = String(ev.time ?? "").split("+");
    const minuto = comoInt(partesTiempo[0]) || 0;
    const adicional = partesTiempo.length > 1 ? comoInt(partesTiempo[1]) : null;
    const equipo = lado(ev);
    let jugador = (ev.player || "").trim() || null;
    if (jugador) {
      jugador = jugador.replace(/\(og\)/i, "").replace(/\s{2,}/g, " ").trim() || null;
    }
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
  const mid = await buscarMatchId(env, supa, p, cacheFecha, log);
  if (mid === null) return false;

  const detalle = await hlDetalle(env, mid);
  if (!detalle) {
    log.push(`  HL sin detalle match ${mid} (${p.equipo_local} vs ${p.equipo_visita})`);
    return false;
  }

  let hizoAlgo = false;

  // --- Eventos (goles+asist, tarjetas, cambios). HL manda: borra+reinserta. ---
  const filas = await eventosDesdeHl(detalle, p, supa);
  if (filas.length) {
    await supa.del("partido_eventos", { partido_id: `eq.${p.id}` });
    await supa.insert("partido_eventos", filas);
    hizoAlgo = true;
    const n = (t) => filas.filter((f) => f.tipo === t).length;
    const asist = filas.filter((f) => f.tipo === "gol" && f.asistencia).length;
    log.push(`  OK eventos ${p.equipo_local} vs ${p.equipo_visita}: ${n("gol")} gol(es) (${asist} con asist.), ${n("amarilla")} amarilla(s), ${n("roja")} roja(s), ${n("cambio")} cambio(s)`);
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

  return hizoAlgo;
}

// Partidos a enriquecer: FT (final + gracia, sin enriquecido_at),
// HT (entretiempo, sin enriquecido_ht_at) y
// 2T (arranco el 2do tiempo, sin enriquecido_2t_at) -> trae asist/tarjetas del
// 1er tiempo a Detalles, que HL suele tener vacias durante el entretiempo.
async function candidatos(supa) {
  const out = [];
  const corteFt = new Date(Date.now() - MIN_GRACIA_FT * 60e3).toISOString();
  const ft = await supa.get("partidos", {
    estado: "eq.final",
    enriquecido_at: "is.null",
    finalizado_at: `lte.${corteFt}`,
    select: "*",
    order: "fecha.asc",
  });
  for (const p of ft) out.push({ p, fase: "ft" });

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

// ------------------------------------------------- deteccion de tramo (HT/2T)
// worldcup26 NO distingue entretiempo (manda 'live' en 1T, ET y 2T). Highlightly
// SI: state.description = "Half time" / "In Progress". La LISTA de HL ya trae ese
// state por partido => 1 llamada por fecha da el estado de todos.
//
// ROBUSTEZ (bug 2026: partido pegado en entretiempo):
//  - Las ventanas se anclan a 'tramo_at' (momento REAL en que se fijo el tramo),
//    NO a la hora programada -> inmune a kickoffs tardios / descuentos largos.
//  - Fallback DURO sin HL: si lleva >=18 min en entretiempo, se fuerza el 2do
//    tiempo aunque Highlightly nunca diga "In Progress". Imposible quedar pegado.
//  - HL solo afina/acelera: ventana [35,80] min (1T->ET) y [8,18] min (ET->2T)
//    desde tramo_at, en minutos pares.
const ET_MAX_MIN = 18; // descanso maximo asumido antes de forzar el 2do tiempo

export async function detectarTramos(supa, env, log) {
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

  // --- Fallback DURO (sin HL, sin throttle): entretiempo >=18 min -> 2do tiempo.
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

  const cacheFecha = {};
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
export async function enriquecerPendientes(supa, env, log) {
  if (!env.HL_KEY) {
    log.push("  enriquecer: sin HL_KEY configurado, omitido.");
    return;
  }

  const lista = await candidatos(supa);
  if (!lista.length) return; // nada pendiente -> cero requests a Highlightly

  log.push(`Enriquecer: ${lista.length} candidato(s) (HT/FT).`);
  const cacheFecha = {};
  let hechos = 0;
  for (const { p, fase } of lista) {
    try {
      if (await enriquecerPartido(env, supa, p, cacheFecha, log)) {
        const campo =
          fase === "ht" ? "enriquecido_ht_at"
          : fase === "2t" ? "enriquecido_2t_at"
          : "enriquecido_at";
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
