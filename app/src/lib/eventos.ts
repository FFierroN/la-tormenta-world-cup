// Helpers de presentacion de eventos (DRY: lo usan el detalle y el admin).
import type { EventoPartido } from "./types";

// Formatea el minuto de un evento contemplando el descuento (anadido).
//   minuto=45, adicional=5 -> "45+5'"
//   minuto=9,  adicional=null -> "9'"
export function fmtMinuto(e: Pick<EventoPartido, "minuto" | "minuto_adicional">): string {
  const extra = e.minuto_adicional ? `+${e.minuto_adicional}` : "";
  return `${e.minuto}${extra}'`;
}
