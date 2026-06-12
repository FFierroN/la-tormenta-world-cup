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

// Nombres de equipo EN -> ES (worldcup26.ir y Highlightly usan ambos ingles).
// Si falta uno, el robot lo loguea como SIN MAPEAR para agregarlo aca.
const EQUIPOS = {
  "Mexico": "México", "South Africa": "Sudáfrica",
  "South Korea": "República de Corea", "Korea Republic": "República de Corea",
  "Czech Republic": "Chequia", "Czechia": "Chequia",
  "Canada": "Canadá", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "USA": "Estados Unidos", "United States": "Estados Unidos",
  "Paraguay": "Paraguay", "Qatar": "Catar", "Switzerland": "Suiza",
  "Brazil": "Brasil", "Morocco": "Marruecos", "Haiti": "Haití",
  "Scotland": "Escocia", "Australia": "Australia",
  "Turkey": "Turquía", "Türkiye": "Turquía",
  "Germany": "Alemania", "Curacao": "Curazao", "Curaçao": "Curazao",
  "Netherlands": "Países Bajos", "Japan": "Japón",
  "Ivory Coast": "Costa de Marfil", "Cote d'Ivoire": "Costa de Marfil",
  "Ecuador": "Ecuador", "Sweden": "Suecia", "Tunisia": "Túnez",
  "Spain": "España", "Cape Verde": "Cabo Verde", "Cabo Verde": "Cabo Verde",
  "Belgium": "Bélgica", "Egypt": "Egipto",
  "Saudi Arabia": "Arabia Saudí", "Uruguay": "Uruguay",
  "Iran": "RI de Irán", "IR Iran": "RI de Irán",
  "New Zealand": "Nueva Zelanda", "France": "Francia", "Senegal": "Senegal",
  "Iraq": "Irak", "Norway": "Noruega", "Argentina": "Argentina",
  "Algeria": "Argelia", "Austria": "Austria", "Jordan": "Jordania",
  "Portugal": "Portugal", "DR Congo": "RD Congo",
  "Congo DR": "RD Congo", "Democratic Republic of Congo": "RD Congo",
  "England": "Inglaterra", "Croatia": "Croacia", "Ghana": "Ghana",
  "Panama": "Panamá", "Uzbekistan": "Uzbekistán", "Colombia": "Colombia",
};

const nuestroNombre = (n) => EQUIPOS[(n || "").trim()] ?? null;

// ----------------------------------------------------------------- casteos
function comoInt(x) {
  if (x === null || x === undefined || x === "" || x === "null") return null;
  const n = parseInt(String(x).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function comoBool(x) {
  if (typeof x === "boolean") return x;
  return String(x).trim().toUpperCase() === "TRUE";
}

// ----------------------------------------------------------------- Supabase
function makeSupa(env) {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_KEY;
  const headers = (extra) => ({
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  });
  // encodeURIComponent => espacios como %20 (no +), tildes y comas escapadas;
  // PostgREST las decodifica antes de parsear. Igual que requests en Python.
  const qs = (params) =>
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

  return {
    async get(table, params) {
      const r = await fetch(`${base}/rest/v1/${table}?${qs(params)}`, { headers: headers() });
      if (!r.ok) throw new Error(`Supabase GET ${table} ${r.status}: ${await r.text()}`);
      return r.json();
    },
    async patch(table, filter, body) {
      const r = await fetch(`${base}/rest/v1/${table}?${qs(filter)}`, {
        method: "PATCH",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Supabase PATCH ${table} ${r.status}: ${await r.text()}`);
    },
    async insert(table, rows) {
      if (!rows || !rows.length) return;
      const r = await fetch(`${base}/rest/v1/${table}`, {
        method: "POST",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify(rows),
      });
      if (!r.ok) throw new Error(`Supabase INSERT ${table} ${r.status}: ${await r.text()}`);
    },
    async del(table, filter) {
      const r = await fetch(`${base}/rest/v1/${table}?${qs(filter)}`, {
        method: "DELETE",
        headers: headers({ Prefer: "return=minimal" }),
      });
      if (!r.ok) throw new Error(`Supabase DELETE ${table} ${r.status}: ${await r.text()}`);
    },
  };
}

// ------------------------------------------------------------------ helpers
function derivarEstado(m) {
  if (comoBool(m.finished)) return "final";
  if (String(m.time_elapsed || "").trim().toLowerCase() === "live") return "en_vivo";
  return "programado";
}

// "J. Quiñones 9'" | "R. Jiménez 67'+2" | "J. Doe 90+3'"
const RE_GOLEADOR = /^\s*(.+?)\s+(\d+)(?:\s*\+\s*\d+)?\s*'?\s*$/;

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
    const mm = c.match(RE_GOLEADOR);
    if (!mm) continue;
    salida.push([mm[1].trim(), Number(mm[2])]);
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
    body.finalizado_at = new Date().toISOString();
  }

  await supa.patch("partidos", { id: `eq.${p.id}` }, body);
  return nuevoEstado;
}

async function sincronizarGoles(supa, p, m, log) {
  const parsed = [];
  for (const [j, min] of parsearScorers(m.home_scorers)) parsed.push([j, min, "local"]);
  for (const [j, min] of parsearScorers(m.away_scorers)) parsed.push([j, min, "visita"]);

  if (!parsed.length) return; // la API no asegura goles -> no tocamos nada

  const existentes = await supa.get("partido_eventos", {
    partido_id: `eq.${p.id}`, tipo: "eq.gol", select: "equipo,minuto,asistencia,detalle",
  });
  const manual = new Map();
  for (const e of existentes) {
    manual.set(`${e.equipo}|${e.minuto}`, {
      asistencia: e.asistencia ?? null,
      detalle: e.detalle || "normal",
    });
  }

  const filas = [];
  const vistos = new Set();
  for (const [jugador, minuto, equipo] of parsed) {
    const k = `${jugador}|${minuto}|${equipo}`;
    if (vistos.has(k)) continue; // la API a veces repite
    vistos.add(k);
    const prev = manual.get(`${equipo}|${minuto}`) || {};
    filas.push({
      partido_id: p.id,
      tipo: "gol",
      equipo,
      minuto,
      jugador, // nombre correcto de la API
      asistencia: prev.asistencia ?? null, // preservado del admin
      detalle: prev.detalle ?? "normal", // preservado del admin
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
