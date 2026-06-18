// Sondeo de alineaciones en Highlightly (version Node, sin dependencias).
// Hace lo mismo que sondear_lineups.py pero con Node (que ya tenes para la app),
// asi evitamos el lio del stub de Python en Windows. NO toca la base de datos.
//
// Uso (en tu PC, con la key en el entorno):
//   set HIGHLIGHTLY_KEY=tu_key            (Windows)
//   node robot/sondear_lineups.mjs 2026-06-11     (fecha con partidos -> toma el 1ro)
//   node robot/sondear_lineups.mjs 123456         (id de partido directo)
//
// Gasta 1-2 requests de los 100 diarios. Solo imprime; no escribe nada.

const HL_BASE = "https://soccer.highlightly.net";
const LEAGUE_ID = 1635;
const SEASON = 2026;

const KEY = process.env.HIGHLIGHTLY_KEY;
if (!KEY) {
  console.error("Falta HIGHLIGHTLY_KEY en el entorno. Setéala y reintenta.");
  process.exit(1);
}

async function hlGet(path, params = {}) {
  const url = new URL(HL_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { "x-rapidapi-key": KEY } });
  console.log(`  [GET ${path}] -> HTTP ${r.status}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

// Desempaca el objeto-partido sin importar el wrapper de Highlightly.
function desempacar(d) {
  if (Array.isArray(d)) return d[0] ?? null;
  if (d && typeof d === "object") {
    if ("data" in d && !("events" in d) && !("statistics" in d)) {
      return desempacar(d.data);
    }
    return d;
  }
  return null;
}

// Busca recursivamente claves que contengan 'objetivo' (case-insensitive).
function buscarClave(obj, objetivo, ruta = "", hits = []) {
  if (Array.isArray(obj)) {
    if (obj.length) buscarClave(obj[0], objetivo, `${ruta}[0]`, hits);
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const rk = ruta ? `${ruta}.${k}` : k;
      if (k.toLowerCase().includes(objetivo.toLowerCase())) hits.push(rk);
      buscarClave(v, objetivo, rk, hits);
    }
  }
  return hits;
}

const uniq = (a) => [...new Set(a)].sort();

async function main() {
  const arg = (process.argv[2] || "").trim();
  if (!arg) {
    console.error("Uso: node robot/sondear_lineups.mjs <match_id | YYYY-MM-DD>");
    process.exit(1);
  }

  let matchId = arg;
  if (arg.includes("-") && arg.length === 10) {
    console.log(`Listando partidos del ${arg}...`);
    const data = await hlGet("/matches", { leagueId: LEAGUE_ID, season: SEASON, date: arg });
    const partidos = Array.isArray(data) ? data : data.data || [];
    if (!partidos.length) {
      console.error("No hubo partidos esa fecha. Probá otra (un día con partidos jugados).");
      process.exit(1);
    }
    matchId = partidos[0].id ?? partidos[0].matchId;
    console.log(`  Tomando el primero: id=${matchId}`);
  }

  console.log(`\n=== Detalle del partido ${matchId} ===`);
  const detalle = desempacar(await hlGet(`/matches/${matchId}`));
  if (!detalle || typeof detalle !== "object") {
    console.error("Respuesta inesperada del detalle.");
    process.exit(1);
  }

  console.log("\nClaves de nivel superior del partido:");
  console.log("  " + Object.keys(detalle).join(", "));

  // [1] lineups / formation
  console.log("\n[1] ¿LINEUPS / FORMATION?");
  let rl = [
    ...buscarClave(detalle, "lineup"),
    ...buscarClave(detalle, "formation"),
    ...buscarClave(detalle, "starting"),
    ...buscarClave(detalle, "squad"),
  ];
  if (rl.length) {
    console.log("  SÍ aparece en:", uniq(rl).join(", "));
  } else {
    console.log("  No se vio en /matches/{id}. Probando endpoint dedicado /lineups...");
    try {
      const ln = await hlGet("/lineups", { matchId });
      console.log("  /lineups respondió. Claves:",
        ln && typeof ln === "object" ? Object.keys(ln).join(", ") : typeof ln);
      console.log(JSON.stringify(ln, null, 2).slice(0, 1500));
    } catch (e) {
      console.log("  /lineups falló:", e.message);
    }
  }

  // [2] foto del jugador
  console.log("\n[2] ¿FOTO del jugador (URL)?");
  const rf = [
    ...buscarClave(detalle, "photo"),
    ...buscarClave(detalle, "image"),
    ...buscarClave(detalle, "logo"),
    ...buscarClave(detalle, "avatar"),
  ];
  console.log("  " + (rf.length ? "SÍ: " + uniq(rf).join(", ") : "No se vieron campos de foto."));

  // [3] stats por jugador
  console.log("\n[3] ¿STATS por jugador?");
  const rp = [
    ...buscarClave(detalle, "player"),
    ...buscarClave(detalle, "rating"),
    ...buscarClave(detalle, "statistics"),
  ];
  console.log("  " + (rp.length ? "Campos: " + uniq(rp).join(", ") : "No se vieron stats por jugador."));

  console.log("\n=== JSON crudo (primeros 2500 chars) ===");
  console.log(JSON.stringify(detalle, null, 2).slice(0, 2500));
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
