// Helper: dado el puesto y total de jugadores, elige cual avatar mostrar.
// Regla confirmada: puesto 1 -> pos1, ultimo -> pos8, resto -> medio.
import type { FilaTabla } from "./types";

export function avatarPorPosicion(fila: FilaTabla, total: number): string | null {
  if (fila.posicion === 1) return fila.avatar_pos1 ?? fila.avatar_medio;
  if (fila.posicion === total) return fila.avatar_pos8 ?? fila.avatar_medio;
  return fila.avatar_medio ?? fila.avatar_pos1;
}
