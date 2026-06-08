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
  fecha: string; // ISO
  equipo_local: string;
  equipo_visita: string;
  pais_local: string; // codigo ISO para bandera
  pais_visita: string;
  goles_local: number | null;
  goles_visita: number | null;
  minuto: number | null; // minuto en vivo
  penales_local: number | null; // tanda de penales (llaves)
  penales_visita: number | null;
  ganador_penales: "local" | "visita" | null;
  estado: EstadoPartido;
}

export type TipoEvento = "gol" | "amarilla" | "roja";

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
