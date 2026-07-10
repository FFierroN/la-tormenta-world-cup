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

// Distincion contra un set de ganadores (goleador/asistidor pueden empatar en la
// cima -> array). Devuelve los puntos si el pick esta en el set, 0 si no.
export function puntosDistincionSet(
  pick: string | null,
  ganadores: string[],
  valor: number
): number {
  if (!pick || ganadores.length === 0) return 0;
  return ganadores.includes(norm(pick)) ? valor : 0;
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

// ¿Ya hay resultado para esta categoria? (distingue "pendiente" de "fallado").
export function haySet(ganadores: string[]): boolean {
  return ganadores.length > 0;
}
export function hayUnico(real: string | null): boolean {
  return !!real;
}
