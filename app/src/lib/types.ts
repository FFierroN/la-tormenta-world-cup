// Tipos del dominio. Se ajustan cuando confirmemos el schema final de Supabase.

export type EstadoPartido =
  | "programado"
  | "en_vivo"
  | "entretiempo"
  | "alargue"
  | "penales"
  | "final"
  | "suspendido";

export interface Jugador {
  id: string;
  nombre: string;
  alias: string | null;
  es_admin: boolean;
  avatar_pos1: string | null; // foto cuando va 1ro
  avatar_medio: string | null; // foto puestos 2-7
  avatar_pos8: string | null; // foto ultimo
}

export interface Partido {
  id: string;
  fase: string; // grupos / octavos / etc
  grupo: string | null; // A..L (solo fase de grupos)
  fecha: string; // ISO
  estadio: string | null;
  ciudad: string | null;
  equipo_local: string;
  equipo_visita: string;
  pais_local: string; // codigo ISO para bandera
  pais_visita: string;
  goles_local: number | null;
  goles_visita: number | null;
  minuto: number | null; // minuto en vivo (ancla)
  minuto_at: string | null; // ISO: cuando se midio 'minuto' (para el reloj local)
  penales_local: number | null; // tanda de penales (llaves)
  penales_visita: number | null;
  ganador_penales: "local" | "visita" | null;
  estado: EstadoPartido;
  estadisticas: EstadisticasPartido | null; // panel de stats (Highlightly)
}

// Stats del partido tal como las guarda el robot (Highlightly). Las llaves son
// los displayName crudos de la API (ej. "Possession", "Expected Goals"); el
// front elige cuales mostrar y como formatearlas.
export interface EstadisticasPartido {
  local: Record<string, number | null>;
  visita: Record<string, number | null>;
  top_players?: unknown; // crudo, para una fase futura
}

export type TipoEvento = "gol" | "amarilla" | "roja" | "cambio";

export interface EventoPartido {
  id: string;
  partido_id: string;
  tipo: TipoEvento;
  equipo: "local" | "visita";
  minuto: number;
  jugador: string | null; // quien hizo el gol / recibio tarjeta
  asistencia: string | null; // quien asistio (solo goles)
  detalle: string | null; // 'penal' | 'autogol' | 'normal'
}

export interface Pronostico {
  id: string;
  partido_id: string;
  jugador_id: string;
  pred_local: number;
  pred_visita: number;
  puntos: number | null; // calculado tras el resultado
}

// Pronostico tal como lo devuelve la RPC pronosticos_partido (con nombre listo).
// Oculta los ajenos hasta que el partido empieza (logica en el servidor).
export interface PronosticoVista {
  jugador_id: string;
  nombre: string;
  pred_local: number;
  pred_visita: number;
  puntos: number;
}

// Categoria del resultado de una prediccion ya jugada (null si aun no se juega).
export type ResultadoPrediccion = "exacto" | "diferencia" | "acierto" | "falla";

// Una prediccion mia con el detalle del partido (pantalla "Mis predicciones").
// La devuelve la RPC mis_predicciones_detalle. Solo trae las que YO pronostique.
export interface MiPrediccion {
  partido_id: string;
  fase: string;
  grupo: string | null;
  fecha: string; // ISO
  estado: EstadoPartido;
  equipo_local: string;
  equipo_visita: string;
  pais_local: string;
  pais_visita: string;
  goles_local: number | null;
  goles_visita: number | null;
  pred_local: number;
  pred_visita: number;
  puntos: number | null;
  resultado: ResultadoPrediccion | null;
}

// Predicciones especiales pre-mundial (bonus).
export interface Especiales {
  campeon: string | null;
  finalista_1: string | null;
  finalista_2: string | null;
  semifinalista_1: string | null;
  semifinalista_2: string | null;
  semifinalista_3: string | null;
  semifinalista_4: string | null;
  goleador: string | null;
  asistidor: string | null;
  mejor_jugador: string | null;
  mejor_arquero: string | null;
  mejor_joven: string | null;
}

// Fila de la tabla de posiciones de un grupo del Mundial.
export interface FilaGrupo {
  grupo: string; // A..L
  pais: string; // codigo ISO para bandera
  equipo: string;
  pj: number; // partidos jugados
  pg: number; // ganados
  pe: number; // empatados
  pp: number; // perdidos
  gf: number; // goles a favor
  gc: number; // goles en contra
  dg: number; // diferencia de goles
  pts: number; // puntos
  pos: number; // posicion dentro del grupo
}

// Jugador tal como lo ve el panel de admin (incluye dados de baja y ajuste).
export interface JugadorAdmin {
  id: string;
  nombre: string;
  alias: string | null;
  es_admin: boolean;
  activo: boolean;
  ajuste_puntos: number;
  ajuste_motivo: string | null;
}

// Una entrada del ranking de goleadores o asistidores (Top N).
export interface FilaGoleo {
  jugador: string;
  total: number;
  pais: string | null; // codigo ISO-2 del pais del jugador (para la bandera)
}

// Desglose de pronosticos de un miembro (pestana LaTormenta). Las 4 categorias
// suman 'total' (pronosticos de partidos ya finalizados).
export interface FilaTormenta {
  posicion: number;
  jugador_id: string;
  nombre: string;
  alias: string | null;
  exactos: number;
  diferencias: number;
  aciertos: number;
  fallas: number;
  total: number;
}

// Fila derivada de la tabla de posiciones.
export interface FilaTabla {
  jugador_id: string;
  nombre: string;
  alias: string | null;
  posicion: number;
  puntos: number;
  exactos: number;
  aciertos: number;
  fallas: number;
  avatar_pos1: string | null;
  avatar_medio: string | null;
  avatar_pos8: string | null;
}
