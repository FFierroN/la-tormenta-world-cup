// Tema visual del rediseno WC26: traduce el estado de un partido a las clases
// del MARCO de la tarjeta (neon / sutil / apagado) y si lleva glow pulsante.
//
// Fuente unica (DRY): tanto la tarjeta de la lista como (a futuro) el detalle
// del partido deben leer de aqui. Si manana cambia "como se ve un partido en
// vivo", se toca SOLO este archivo.
import type { EstadoPartido } from "./types";
import { enCurso } from "./estados";

export interface TemaPartido {
  /** Clase del contenedor de la tarjeta (marco-wc / marco-sutil / marco-apagado). */
  marco: string;
  /** true si el marco ademas pulsa (solo partidos rodando / entretiempo). */
  glow: boolean;
  /** true si la tarjeta se ve atenuada (partido ya jugado). */
  atenuado: boolean;
}

// en vivo / alargue / penales / entretiempo  -> marco neon (con glow).
// final                                       -> apagado.
// programado / suspendido                     -> sutil.
export function temaPartido(estado: EstadoPartido): TemaPartido {
  const rodando = enCurso(estado) || estado === "entretiempo";
  if (rodando) {
    return { marco: "marco-wc", glow: true, atenuado: false };
  }
  if (estado === "final") {
    return { marco: "marco-apagado", glow: false, atenuado: true };
  }
  // programado / suspendido
  return { marco: "marco-sutil", glow: false, atenuado: false };
}
