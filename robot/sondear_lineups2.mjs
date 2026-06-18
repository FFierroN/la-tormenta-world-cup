// Sondeo #2: confirmar si EXISTE algun endpoint de lineups en Highlightly,
// probando varias rutas; y volcar la estructura de topPlayers (por si
// pivoteamos a "jugadores destacados"). NO toca la base. ~1-5 requests.
//
//   set HIGHLIGHTLY_KEY=tu_key
//   node robot/sondear_lineups2.mjs 1267462313

const HL_BASE = "https://soccer.highlightly.net";
const KEY = process.env.HIGHLIGHTLY_KEY;
if (!KEY) { console.error("Falta HIGHLIGHTLY_KEY."); process.exit(1); }

const matchId = (process.argv[2] || "").trim();
if (!matchId) { console.error("Uso: node robot/sondear_lineups2.mjs <match_id>"); process.exit(1); }

async function probe(path, params = {}) {
  const url = new URL(HL_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const r = await fetch(url, { headers: { "x-rapidapi-key": KEY } });
    const body = await r.text();
    console.log(`  [${r.status}] GET ${path}${Object.keys(params).length ? "?" + new URLSearchParams(params) : ""}`);
    if (r.ok) console.log("      OK ->", body.slice(0, 300));
    return r.ok ? JSON.parse(body) : null;
  } catch (e) {
    console.log(`  [ERR] GET ${path}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log("== Probando rutas posibles de LINEUPS ==");
  await probe(`/matches/${matchId}/lineups`);
  await probe(`/lineups/${matchId}`);
  await probe(`/matches/lineups/${matchId}`);
  await probe(`/lineups`, { matchId });

  console.log("\n== Estructura de topPlayers (homeTeam) ==");
  const r = await fetch(`${HL_BASE}/matches/${matchId}`, { headers: { "x-rapidapi-key": KEY } });
  const d = await r.json();
  const m = Array.isArray(d) ? d[0] : (d.data && !d.events ? (Array.isArray(d.data) ? d.data[0] : d.data) : d);
  const tp = m?.homeTeam?.topPlayers;
  console.log(JSON.stringify(tp, null, 2).slice(0, 2000));
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
