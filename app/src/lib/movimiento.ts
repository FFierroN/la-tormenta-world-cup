// Movimiento de posicion: compara la posicion OFICIAL (anterior) con la
// posicion en vivo / provisional (actual). Numero MENOR = mejor lugar.
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
