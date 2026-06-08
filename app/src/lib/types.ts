// Tipos del dominio. Se ajustan cuando confirmemos el schema final de Supabase.

export type EstadoPartido =
  | "programado"
  | "en_vivo"
  | "medio_tiempo"
  | "final";

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
  estado: EstadoPartido;
}

export type TipoEvento = "gol" | "roja";

export interface EventoPartido {
  id: string;
  partido_id: string;
  tipo: TipoEvento;
  equipo: "local" | "visita";
  minuto: number;
  jugador: string | null; // opcional (modo liviano)
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
