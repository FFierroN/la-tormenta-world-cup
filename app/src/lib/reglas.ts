// Reglas de puntuacion (solo para mostrar). La fuente de calculo real vive en
// la base (funciones calcular_puntos_pronostico y recalcular_especiales).
// Si cambias los puntajes alla, actualiza aqui tambien.

// Partidos: el EXACTO vale segun cuantos lo clavaron (unico / x2 / x3+).
export const PUNTOS_PARTIDO = [
  { fase: "Grupos / Dieciseisavos", unico: 6, x2: 5, x3: 4, diferencia: 3, acierto: 2 },
  { fase: "Octavos / Cuartos", unico: 9, x2: 7, x3: 6, diferencia: 4, acierto: 3 },
  { fase: "Semis / Tercer puesto", unico: 12, x2: 10, x3: 8, diferencia: 6, acierto: 4 },
  { fase: "Final", unico: 15, x2: 12, x3: 10, diferencia: 7, acierto: 5 },
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
