// Carga ALINEACIONES desde tu PC (Node), sin esperar al cron ni a Actions.
// Lee los partidos que ya tienen highlightly_id cacheado, baja /lineups/{id}
// y guarda partidos.alineaciones en Supabase. Ideal para testear la visual ya.
//
// Requisitos (en tu PC):
//   1) Haber corrido db/FIX-alineaciones.sql en Supabase (crea la columna).
//   2) Variables de entorno:
//        set HIGHLIGHTLY_KEY=tu_key
//        set SUPABASE_URL=https://xxxx.supabase.co
//        set SUPABASE_SERVICE_KEY=tu_service_role_key   (Supabase > Settings > API)
//
// Uso:
//   node robot/cargar_alineaciones.mjs           (todos los que tengan highlightly_id)
//   node robot/cargar_alineaciones.mjs 1267462313  (un highlightly_id puntual)
//
// OJO: la SERVICE_KEY es secreta. No la pegues en commits ni en el chat.

const HL_BASE = "https://soccer.highlightly.net";
const HL_KEY = process.env.HIGHLIGHTLY_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!HL_KEY || !SB_URL || !SB_KEY) {
  console.error("Faltan env: HIGHLIGHTLY_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbPatch(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase PATCH ${r.status}: ${await r.text()}`);
}

async function hlGet(path) {
  const r = await fetch(`${HL_BASE}${path}`, { headers: { "x-rapidapi-key": HL_KEY } });
  if (!r.ok) throw new Error(`Highlightly ${r.status}`);
  return r.json();
}

// --- Normalizacion (misma forma que robot/alineaciones.py) ---
const jug = (j) => ({
  nombre: (j?.name || "").trim(),
  numero: j?.number ?? null,
  posicion: j?.position ?? null,
  id: j?.id ?? null,
});

function lineas(initial) {
  if (!Array.isArray(initial)) return [];
  if (initial.length && Array.isArray(initial[0])) {
    return initial.map((linea) => linea.map(jug));
  }
  return [initial.map(jug)];
}

function equipo(eq) {
  if (!eq || typeof eq !== "object") return null;
  return {
    formacion: eq.formation ?? null,
    titulares: lineas(eq.initialLineup),
    suplentes: (eq.substitutes || []).map(jug),
  };
}

function normalizar(data) {
  let d = data;
  if (d && typeof d === "object" && !("homeTeam" in d) && "data" in d) d = d.data;
  if (!d || typeof d !== "object") return null;
  const local = equipo(d.homeTeam);
  const visita = equipo(d.awayTeam);
  const vacio = (e) => !e || (!e.titulares.length && !e.suplentes.length);
  if (vacio(local) && vacio(visita)) return null;
  return { local, visita };
}

async function main() {
  const arg = (process.argv[2] || "").trim();

  let partidos;
  if (arg) {
    partidos = await sbGet(
      `partidos?highlightly_id=eq.${arg}&select=id,equipo_local,equipo_visita,highlightly_id`
    );
  } else {
    partidos = await sbGet(
      "partidos?highlightly_id=not.is.null&select=id,equipo_local,equipo_visita,highlightly_id&order=fecha"
    );
  }

  if (!partidos.length) {
    console.log("No hay partidos con highlightly_id. Corré primero el enriquecer (ya lo hiciste).");
    return;
  }
  console.log(`${partidos.length} partido(s) con highlightly_id. Cargando alineaciones...`);

  let ok = 0;
  for (const p of partidos) {
    const etiqueta = `${p.equipo_local} vs ${p.equipo_visita}`;
    try {
      const data = await hlGet(`/lineups/${p.highlightly_id}`);
      const al = normalizar(data);
      if (!al) {
        console.log(`  [${etiqueta}] sin alineacion en HL todavía.`);
        continue;
      }
      await sbPatch(`partidos?id=eq.${p.id}`, { alineaciones: al });
      ok++;
      console.log(`  [${etiqueta}] OK  local ${al.local?.formacion} / visita ${al.visita?.formacion}`);
    } catch (e) {
      console.log(`  [${etiqueta}] ERROR: ${e.message}`);
    }
  }
  console.log(`\nListo: ${ok} alineacion(es) cargada(s). Abrí la app y mirá la pestaña Alineaciones.`);
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
