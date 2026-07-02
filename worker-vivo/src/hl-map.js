// hl-map.js — Mapeo PURO de la respuesta de Highlightly a nuestro modelo.
// Funciones sin efectos secundarios (faciles de testear). Las consume el worker
// para leer estado y marcador desde HL (fuente primaria tras la migracion).
//
// Estructura REAL de HL confirmada 2026-07-01 (endpoint /matches):
//   {
//     id: 1333779892,
//     date: "2026-07-01T20:00:00.000Z",          // ISO 8601 UTC limpio
//     state: {
//       clock: 120,
//       score: { current: "3 - 2", penalties: null },  // "local - visita"
//       description: "Finished after extra time"
//     },
//     homeTeam: { id, name: "Belgium" },
//     awayTeam: { id, name: "Senegal" }
//   }

import { comoInt } from "./comun.js";

// Marcador: HL manda "3 - 2" (local - visita) en state.score.current.
// Devuelve { local, visita } con enteros, o null en cada lado si no se pudo leer.
export function marcadorDesdeHl(state) {
  const cur = ((state || {}).score || {}).current;
  if (!cur || typeof cur !== "string") return { local: null, visita: null };
  const partes = cur.split("-").map((x) => x.trim());
  if (partes.length !== 2) return { local: null, visita: null };
  return { local: comoInt(partes[0]), visita: comoInt(partes[1]) };
}

// Penales: state.score.penalties (ej. "4 - 3") o null si no hubo.
export function penalesDesdeHl(state) {
  const pen = ((state || {}).score || {}).penalties;
  if (!pen || typeof pen !== "string") return { local: null, visita: null };
  const partes = pen.split("-").map((x) => x.trim());
  if (partes.length !== 2) return { local: null, visita: null };
  return { local: comoInt(partes[0]), visita: comoInt(partes[1]) };
}

// Estado: mapea state.description (+ clock) a nuestros estados.
// Valores de HL confirmados: "In Progress", "Half time", "Finished",
// "Finished after extra time". El resto se infiere de forma defensiva.
// Devuelve null si no hay certeza (el worker NO debe tocar el estado en ese caso).
export function estadoDesdeHl(state) {
  const desc = String((state || {}).description || "").trim().toLowerCase();
  if (!desc) return null;

  // Terminado (incluye "Finished after extra time" / tras penales).
  if (desc.includes("finish") || desc.includes("full time") || desc === "ft") {
    return "final";
  }
  // Entretiempo.
  if (desc.includes("half time") || desc.includes("halftime") || desc === "ht") {
    return "entretiempo";
  }
  // Penales en curso.
  if (desc.includes("penalt") || desc.includes("shootout")) return "penales";
  // Alargue en curso (ojo: "finished after extra time" ya salio arriba como final).
  if (desc.includes("extra time") || desc.includes("extra-time")) return "alargue";
  // En juego (1er/2do tiempo).
  if (
    desc.includes("in progress") || desc.includes("live") ||
    desc.includes("1st half") || desc.includes("2nd half") ||
    desc.includes("first half") || desc.includes("second half")
  ) {
    return "en_vivo";
  }
  // Aun no arranca.
  if (
    desc.includes("not started") || desc.includes("scheduled") ||
    desc === "ns" || desc.includes("tbd") || desc.includes("postponed")
  ) {
    return "programado";
  }
  // Desconocido: sin certeza -> el worker no cambia el estado.
  return null;
}
