// Reglas de puntuacion (solo para mostrar). La fuente de calculo real vive en
// la base (funciones calcular_puntos_pronostico y recalcular_especiales).
// Si cambias los puntajes alla, actualiza aqui tambien.

export const PUNTOS_PARTIDO = [
  { fase: "Grupos / Dieciseisavos", exacto: 6, diferencia: 4, acierto: 2 },
  { fase: "Octavos / Cuartos", exacto: 8, diferencia: 6, acierto: 4 },
  { fase: "Semifinales", exacto: 10, diferencia: 8, acierto: 6 },
  { fase: "Tercer puesto", exacto: 8, diferencia: 6, acierto: 4 },
  { fase: "Final", exacto: 12, diferencia: 10, acierto: 8 },
];

export const BONUS = [
  { pts: "+3", ejemplo: "Goleada: 4-2, 5-1, 5-3..." },
  { pts: "+2", ejemplo: "3-2, 4-0, 4-1" },
  { pts: "+1", ejemplo: "2-2, 3-0, 3-1" },
  { pts: "+0", ejemplo: "Pocos goles: 0-0, 1-0, 1-1, 2-0, 2-1" },
];

export const PUNTOS_ESPECIALES = [
  { item: "Campeon", pts: 20 },
  { item: "Cada finalista correcto", pts: 8 },
  { item: "Cada semifinalista correcto", pts: 5 },
  { item: "Goleador del torneo", pts: 10 },
  { item: "Mejor jugador", pts: 8 },
  { item: "Mejor arquero", pts: 6 },
  { item: "Mejor jugador joven", pts: 6 },
];
