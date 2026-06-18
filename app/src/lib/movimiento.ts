// Movimiento de posicion: compara la posicion ANTERIOR (referencia: cierre de
// la jornada anterior) con la posicion ACTUAL (ahora, en vivo u oficial).
// Numero MENOR = mejor lugar.
//   actual < anterior  -> 'sube'  (mejoro: verde, flecha arriba)
//   actual > anterior  -> 'baja'  (empeoro: rojo, flecha abajo)
//   iguales / sin dato -> 'igual' (gris, circulo)
export type Movimiento = "sube" | "baja" | "igual";

export function calcularMovimiento(
  actual: number | null | undefined,
  anterior: number | null | undefined
): Movimiento {
  if (actual == null || anterior == null) return "igual";
  if (actual < anterior) return "sube";
  if (actual > anterior) return "baja";
  return "igual";
}
