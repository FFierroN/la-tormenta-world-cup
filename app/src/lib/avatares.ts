// Helpers de avatar: cual foto mostrar y de que color el borde, segun el puesto.
import type { FilaTabla } from "./types";

export type VarianteBorde = "oro" | "plata" | "bronce" | "gris" | "rojo";

// Regla confirmada: puesto 1 -> pos1, ultimo -> pos8, resto -> medio.
export function avatarPorPosicion(fila: FilaTabla, total: number): string | null {
  if (fila.posicion === 1) return fila.avatar_pos1 ?? fila.avatar_medio;
  if (fila.posicion === total) return fila.avatar_pos8 ?? fila.avatar_medio;
  return fila.avatar_medio ?? fila.avatar_pos1;
}

// Borde: 1ro dorado, 2do plata, 3ro bronce, ultimo rojo, resto gris.
export function bordePorPosicion(posicion: number, total: number): VarianteBorde {
  if (posicion === 1) return "oro";
  if (posicion === 2) return "plata";
  if (posicion === 3) return "bronce";
  if (posicion === total) return "rojo";
  return "gris";
}
