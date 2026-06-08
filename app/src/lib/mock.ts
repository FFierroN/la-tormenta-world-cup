// Datos de ejemplo para previsualizar la UI sin Supabase conectado.
// Se borran cuando enchufemos el backend real.
import type { FilaTabla, Partido, EventoPartido, Pronostico, Jugador } from "./types";

export const MOCK_JUGADORES: Jugador[] = [
  ph("j1", "Felipe", "Pipe", true),
  ph("j2", "Diego", "Dieguito", false),
  ph("j3", "Martin", "Tincho", false),
  ph("j4", "Caro", "Caro", false),
  ph("j5", "Seba", "Seba", false),
  ph("j6", "Nico", "Nico", false),
  ph("j7", "Vale", "Vale", false),
  ph("j8", "Tomas", "Tomi", false),
];

function ph(id: string, nombre: string, alias: string, admin: boolean): Jugador {
  return {
    id,
    nombre,
    alias,
    es_admin: admin,
    avatar_pos1: null,
    avatar_medio: null,
    avatar_pos8: null,
  };
}

export const MOCK_TABLA: FilaTabla[] = MOCK_JUGADORES.map((j, i) => ({
  jugador_id: j.id,
  nombre: j.nombre,
  alias: j.alias,
  posicion: i + 1,
  puntos: 130 - i * 14,
  exactos: 9 - i,
  aciertos: 16 - i,
  fallas: 4 + i,
  avatar_pos1: null,
  avatar_medio: null,
  avatar_pos8: null,
})).map((f) => ({ ...f, exactos: Math.max(0, f.exactos), aciertos: Math.max(0, f.aciertos) }));

export const MOCK_PARTIDOS: Partido[] = [
  {
    id: "p1",
    fase: "Fase de grupos",
    fecha: "2026-06-11T19:00:00Z",
    equipo_local: "Maldivas",
    equipo_visita: "Pakistan",
    pais_local: "mv",
    pais_visita: "pk",
    goles_local: 0,
    goles_visita: 3,
    minuto: null,
    penales_local: null,
    penales_visita: null,
    ganador_penales: null,
    estado: "final",
  },
  {
    id: "p2",
    fase: "Fase de grupos",
    fecha: "2026-06-11T22:00:00Z",
    equipo_local: "Mexico",
    equipo_visita: "Canada",
    pais_local: "mx",
    pais_visita: "ca",
    goles_local: 1,
    goles_visita: 1,
    minuto: 67,
    penales_local: null,
    penales_visita: null,
    ganador_penales: null,
    estado: "en_vivo",
  },
  {
    id: "p3",
    fase: "Fase de grupos",
    fecha: "2026-06-12T19:00:00Z",
    equipo_local: "Argentina",
    equipo_visita: "Chile",
    pais_local: "ar",
    pais_visita: "cl",
    goles_local: null,
    goles_visita: null,
    minuto: null,
    penales_local: null,
    penales_visita: null,
    ganador_penales: null,
    estado: "programado",
  },
];

export const MOCK_EVENTOS: Record<string, EventoPartido[]> = {
  p1: [
    { id: "e1", partido_id: "p1", tipo: "gol", equipo: "visita", minuto: 54, jugador: "S. Khan", asistencia: "A. Ali", detalle: "normal" },
    { id: "e2", partido_id: "p1", tipo: "amarilla", equipo: "local", minuto: 71, jugador: "M. Nashid", asistencia: null, detalle: null },
    { id: "e3", partido_id: "p1", tipo: "gol", equipo: "visita", minuto: 84, jugador: "S. Khan", asistencia: null, detalle: "penal" },
    { id: "e4", partido_id: "p1", tipo: "roja", equipo: "local", minuto: 86, jugador: "I. Hassan", asistencia: null, detalle: null },
    { id: "e5", partido_id: "p1", tipo: "gol", equipo: "visita", minuto: 87, jugador: "B. Iqbal", asistencia: "S. Khan", detalle: "normal" },
  ],
  p2: [
    { id: "e6", partido_id: "p2", tipo: "gol", equipo: "local", minuto: 23, jugador: "R. Jimenez", asistencia: "H. Lozano", detalle: "normal" },
    { id: "e7", partido_id: "p2", tipo: "gol", equipo: "visita", minuto: 61, jugador: "J. David", asistencia: null, detalle: "normal" },
  ],
};

export const MOCK_PRONOSTICOS: Record<string, Pronostico[]> = {
  p1: MOCK_JUGADORES.map((j, i) => ({
    id: `pr-${j.id}`,
    partido_id: "p1",
    jugador_id: j.id,
    pred_local: i % 3,
    pred_visita: (i + 1) % 4,
    puntos: i % 3 === 0 ? 5 : i % 2 === 0 ? 2 : 0,
  })),
};
