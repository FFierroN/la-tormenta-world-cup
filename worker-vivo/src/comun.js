/**
 * Helpers compartidos del Worker (espejo de robot/comun.py).
 * Usados por index.js (robot en vivo) y enriquecer.js (Highlightly).
 */

// Nombres de equipo EN -> ES (worldcup26.ir y Highlightly usan ingles).
// Si falta uno, el robot lo loguea como SIN MAPEAR para agregarlo aca.
export const EQUIPOS = {
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

// Lookup exacto y, si falla, normaliza "&" -> "and" (consistente con comun.py).
export const nuestroNombre = (n) => {
  const s = (n || "").trim();
  return EQUIPOS[s] ?? EQUIPOS[s.replace(" & ", " and ")] ?? null;
};

// ----------------------------------------------------------------- casteos
export function comoInt(x) {
  if (x === null || x === undefined || x === "" || x === "null") return null;
  const n = parseInt(String(x).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

export function comoBool(x) {
  if (typeof x === "boolean") return x;
  return String(x).trim().toUpperCase() === "TRUE";
}

// ----------------------------------------------------------------- Supabase
export function makeSupa(env) {
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
