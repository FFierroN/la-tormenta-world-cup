// Sondeo #3: vuelca el JSON COMPLETO de /lineups/{matchId} a un archivo y
// prueba si existe FOTO por jugador (construyendo la URL con el id).
// NO toca la base. ~2-3 requests + 1 HEAD de imagen.
//
//   set HIGHLIGHTLY_KEY=tu_key
//   node robot/sondear_lineups3.mjs 1267462313

import { writeFileSync } from "node:fs";

const HL_BASE = "https://soccer.highlightly.net";
const KEY = process.env.HIGHLIGHTLY_KEY;
if (!KEY) { console.error("Falta HIGHLIGHTLY_KEY."); process.exit(1); }

const matchId = (process.argv[2] || "").trim();
if (!matchId) { console.error("Uso: node robot/sondear_lineups3.mjs <match_id>"); process.exit(1); }

async function main() {
  console.log(`== Lineup completo de ${matchId} ==`);
  const r = await fetch(`${HL_BASE}/lineups/${matchId}`, { headers: { "x-rapidapi-key": KEY } });
  console.log("  HTTP", r.status);
  if (!r.ok) { console.error(await r.text()); process.exit(1); }
  const data = await r.json();

  // Guardamos el JSON entero para inspeccionarlo con calma.
  writeFileSync("lineup_ejemplo.json", JSON.stringify(data, null, 2), "utf8");
  console.log("  -> guardado en lineup_ejemplo.json (abrilo para ver TODO)");

  // Resumen de estructura: claves de cada equipo.
  for (const lado of ["homeTeam", "awayTeam"]) {
    const t = data[lado] || data?.data?.[lado];
    if (!t) { console.log(`  ${lado}: (no se encontró)`); continue; }
    console.log(`\n  ${lado}: claves =`, Object.keys(t).join(", "));
    console.log(`    formation =`, t.formation);
    // Buscamos como se llama el 11 inicial (startXI / starters / initial / players...)
    for (const k of Object.keys(t)) {
      const v = t[k];
      if (Array.isArray(v) && v.length) {
        console.log(`    ${k}: array de ${v.length}, ej =`, JSON.stringify(v[0]));
      }
    }
  }

  // Prueba de FOTO por jugador: tomamos un id cualquiera y probamos rutas.
  const home = data.homeTeam || data?.data?.homeTeam || {};
  const algun = (home.substitutes || home.startXI || home.starters || home.players || [])[0];
  const pid = algun?.id ?? algun?.player?.id;
  console.log("\n== Prueba de FOTO de jugador (id =", pid, ") ==");
  if (pid) {
    const urls = [
      `https://highlightly.net/soccer/images/players/${pid}.png`,
      `https://highlightly.net/soccer/images/players/${pid}.jpg`,
      `https://media.api-sports.io/football/players/${pid}.png`,
    ];
    for (const u of urls) {
      try {
        const h = await fetch(u, { method: "GET" });
        console.log(`  [${h.status}] ${u}  (content-type: ${h.headers.get("content-type")})`);
      } catch (e) { console.log(`  [ERR] ${u}: ${e.message}`); }
    }
  } else {
    console.log("  No pude extraer un id de jugador para probar.");
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
