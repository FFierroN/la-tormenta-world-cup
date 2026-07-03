// Reglas de puntuacion (solo para mostrar). La fuente de calculo real vive en
// la base (funciones calcular_puntos_pronostico y recalcular_especiales).
// Si cambias los puntajes alla, actualiza aqui tambien.

// Partidos: el EXACTO vale segun cuantos lo clavaron (unico / x2 / x3+).
// Tarifa UNICA para toda la copa (antes escalaba por fase; se aplano por pedido
// de los jugadores, 2026-06-28). La fuente real es calcular_puntos_pronostico.
export const PUNTOS_PARTIDO = [
  { fase: "Toda la copa", unico: 6, x2: 5, x3: 4, diferencia: 3, acierto: 2 },
];

// Definicion del empate (solo eliminatoria): apuesta extra de como se resuelve
// un empate. El +2 (modo + equipo que clasifica) es FIJO. El bonus por acertar
// tambien el MARCADOR exacto se REPARTE segun cuantos lo clavaron, igual que el
// Exacto de un partido normal (unico / x2 / x3+). Fuente: calcular_puntos_definicion.
export const PUNTOS_DEFINICION = [
  { item: "Acertar modo + equipo que clasifica", pts: 2 },
  { item: "+ marcador exacto, unico (solo tu)", pts: 5 },
  { item: "+ marcador exacto, x2 (otra persona igual)", pts: 4 },
  { item: "+ marcador exacto, x3+ (tres o mas)", pts: 3 },
];

// Especiales tipo PAIS: por cada equipo cobras solo su ronda mas alta lograda.
export const PUNTOS_PAIS = [
  { item: "Campeon", pts: 30 },
  { item: "Finalista", pts: 12 },
  { item: "Tercer lugar", pts: 8 },
  { item: "Semifinalista", pts: 6 },
];

// Especiales tipo DISTINCION: cada una suma por separado.
export const PUNTOS_DISTINCION = [
  { item: "Goleador", pts: 15 },
  { item: "Asistidor", pts: 10 },
  { item: "Mejor jugador", pts: 10 },
  { item: "Mejor arquero", pts: 10 },
  { item: "Mejor jugador joven", pts: 10 },
];
