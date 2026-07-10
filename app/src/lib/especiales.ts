// Helpers de PRESENTACION para las predicciones especiales.
//
// OJO: el PUNTAJE oficial (con dedup por equipo, etc.) lo calcula la vista SQL
// especiales_puntos (fuente unica de la verdad). Aca solo derivamos, para la UI,
// que ronda logro un equipo elegido y si una distincion fue acertada, contra los
// resultados reales YA DERIVADOS (vista especiales_reales). Son etiquetas/estado,
// no la suma final.
import type { EspecialesReales } from "./types";

const norm = (s: string | null | undefined): string => (s ?? "").trim().toLowerCase();

// Ronda mas alta lograda por un equipo elegido, con sus puntos.
// null = el equipo aun no logra una ronda que puntue (pendiente).
export interface RondaLograda {
  label: string;
  pts: number;
}

export function rondaPais(
  equipo: string | null,
  reales: EspecialesReales
): RondaLograda | null {
  if (!equipo) return null;
  const e = norm(equipo);
  if (reales.campeon && e === reales.campeon) return { label: "Campeón", pts: 30 };
  if (reales.finalistas.includes(e)) return { label: "Finalista", pts: 12 };
  if (reales.tercer && e === reales.tercer) return { label: "3er lugar", pts: 8 };
  if (reales.semifinalistas.includes(e)) return { label: "Semifinalista", pts: 6 };
  return null;
}

// Distincion 1-a-1 (mejor jugador/arquero/joven, manuales). real ya normalizado.
export function puntosDistincionUnico(
  pick: string | null,
  real: string | null,
  valor: number
): number {
  if (!pick || !real) return 0;
  return norm(pick) === real ? valor : 0;
}

// ¿Ya hay resultado para esta distincion manual? (pendiente vs fallado).
export function hayUnico(real: string | null): boolean {
  return !!real;
}

// Situacion EN VIVO de un pick de goleador/asistidor contra el ranking real
// (goles/asistencias acumulados). Sirve para mostrar "5 goles · lider" o
// "3 · a 2 del lider" de forma provisional, enganchado a la tabla de goleo.
export interface SituacionGoleo {
  total: number; // goles/asist. actuales del pick
  liderTotal: number; // tope actual del ranking
  esLider: boolean; // el pick esta en la cima (empatado o solo)
  aDelLider: number; // cuantos le faltan para alcanzar la cima (0 si ya es lider)
}

export function situacionGoleo(
  pick: string | null,
  ranking: { jugador: string; total: number }[]
): SituacionGoleo | null {
  if (!pick) return null;
  const p = norm(pick);
  const liderTotal = ranking.length > 0 ? ranking[0].total : 0;
  const fila = ranking.find((r) => norm(r.jugador) === p);
  const total = fila?.total ?? 0;
  const esLider = total > 0 && total === liderTotal;
  return { total, liderTotal, esLider, aDelLider: Math.max(0, liderTotal - total) };
}
