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
  if (/own\s*goal/i.test(raw)) return { tipo: "gol", autogol: true };
  const t = TIPO_HL[ev.type];
  if (!t) return null;
  const og =
    ev.ownGoal === true || ev.own_goal === true ||
    /\(og\)/i.test(String(ev.player || ""));
  return { tipo: t, autogol: t === "gol" && og };
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

  // Preservar 'detalle' (penal/autogol) por (equipo, minuto): si el robot en
  // vivo o el admin ya lo marcaron, no lo perdemos.
  const previos = await supa.get("partido_eventos", {
    partido_id: `eq.${p.id}`, tipo: "eq.gol", select: "equipo,minuto,detalle",
  });
  const detalleManual = new Map();
  for (const e of previos) {
    detalleManual.set(`${e.equipo}|${e.minuto}`, e.detalle || "normal");
  }

  const filas = [];
  for (const ev of detalle.events || []) {
    const info = tipoEvento(ev);
    if (!info) continue;
    const minuto = comoInt(String(ev.time ?? "").split("+")[0]) || 0;
    const equipo = lado(ev);
    let jugador = (ev.player || "").trim() || null;
    if (jugador) {
      jugador = jugador.replace(/\(og\)/i, "").replace(/\s{2,}/g, " ").trim() || null;
    }
    let asistencia = null;
    let det = null;
    if (info.tipo === "gol") {
      asistencia = (ev.assist || "").trim() || null;
      const manual = detalleManual.get(`${equipo}|${minuto}`);
      det = info.autogol ? "autogol" : (manual ?? "normal");
    } else if (info.tipo === "cambio") {
      asistencia = (ev.substituted || "").trim() || null;
    }
    filas.push({
      partido_id: p.id, tipo: info.tipo, equipo, minuto, jugador, asistencia, detalle: det,
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

// Partidos a enriquecer: FT (final + gracia, sin enriquecido_at) y
// HT (entretiempo, sin enriquecido_ht_at).
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

  return out;
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
        const campo = fase === "ht" ? "enriquecido_ht_at" : "enriquecido_at";
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
