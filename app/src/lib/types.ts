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
  slot: string | null; // codigo de llave P73..P104 (solo eliminatoria)
  origen_local: string | null; // de donde sale el local: '1A'/'2B'/'3ABCDF'/'GP73'/'PP101'
  origen_visita: string | null; // idem visitante
  equipos_bloqueados: boolean; // admin fijo los equipos a mano: el motor no los pisa
  fecha: string; // ISO
  estadio: string | null;
  ciudad: string | null;
  equipo_local: string;
  equipo_visita: string;
  pais_local: string; // codigo ISO para bandera
  pais_visita: string;
  goles_local: number | null;
  goles_visita: number | null;
  puntaje_anulado: boolean; // partido valido (se juega y rellena), pero NO suma puntos
  tramo: "1T" | "ET" | "2T" | null; // tramo en vivo: 1er tiempo / entretiempo / 2do tiempo
  minuto: number | null; // minuto en vivo (ancla)
  minuto_at: string | null; // ISO: cuando se midio 'minuto' (para el reloj local)
  penales_local: number | null; // tanda de penales (llaves)
  penales_visita: number | null;
  ganador_penales: "local" | "visita" | null;
  alargue_local: number | null; // goles SOLO del tiempo extra (llaves)
  alargue_visita: number | null;
  estado: EstadoPartido;
  estadisticas: EstadisticasPartido | null; // panel de stats (Highlightly)
  alineaciones: Alineaciones | null; // formacion + 11 + banca (Highlightly)
}

// Stats del partido tal como las guarda el robot (Highlightly). Las llaves son
// los displayName crudos de la API (ej. "Possession", "Expected Goals"); el
// front elige cuales mostrar y como formatearlas.
export interface EstadisticasPartido {
  local: Record<string, number | null>;
  visita: Record<string, number | null>;
  top_players?: unknown; // crudo, para una fase futura
}

// Alineaciones (Highlightly GET /lineups/{id}), normalizadas por el robot.
// La API NO trae foto de jugador -> el front usa avatar de iniciales + numero.
export interface JugadorAlineacion {
  nombre: string;
  numero: number | null;
  posicion: string | null; // Goalkeeper / Defender / Midfielder / Attacker
  id: number | null; // id de Highlightly (por si algun dia hay foto)
}

export interface AlineacionEquipo {
  formacion: string | null; // ej "4-4-2"
  // titulares agrupados POR LINEAS (como los da la API): [[GK],[DEF..],[MID..],[FWD..]]
  titulares: JugadorAlineacion[][];
  suplentes: JugadorAlineacion[];
}

export interface Alineaciones {
  local: AlineacionEquipo | null;
  visita: AlineacionEquipo | null;
}

export type TipoEvento = "gol" | "amarilla" | "roja" | "cambio" | "penal_tanda";

export interface EventoPartido {
  id: string;
  partido_id: string;
  tipo: TipoEvento;
  equipo: "local" | "visita";
  minuto: number;
  minuto_adicional: number | null; // descuento/anadido (ej. 45+5 -> minuto=45, adicional=5)
  jugador: string | null; // quien hizo el gol / recibio la tarjeta
  asistencia: string | null; // quien asistio (solo goles)
  detalle: string | null; // 'penal' | 'autogol' | 'normal' | (tanda) 'convertido' | 'fallado'
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
  // Prediccion de definicion del empate (solo eliminatoria; null en grupos).
  pred_definicion: ModoDefinicion | null;
  pred_def_local: number | null;
  pred_def_visita: number | null;
  puntos_definicion: number;
  // Bandera del equipo que el jugador eligio como clasificado.
  pred_clasificado: LadoEquipo | null;
}

// 'local' = clasifica el equipo local; 'visita' = clasifica el visitante.
export type LadoEquipo = "local" | "visita";

// Como cree el jugador que se define un empate en fase final.
export type ModoDefinicion = "alargue" | "penales";

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

// Igual que MiPrediccion pero con el dueno del pronostico. La devuelve la RPC
// predicciones_jugadas_todas (solo partidos finales de TODOS), usada por la
// pestana "Casi" para armar el ranking y el detalle por jugador.
export interface PrediccionJugada extends MiPrediccion {
  jugador_id: string;
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

// Especiales de un jugador, con su id (para cruzar con la tabla de posiciones).
// Usado por la pestana piloto que expone las predicciones de todos.
export interface EspecialesConJugador extends Especiales {
  jugador_id: string;
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

// Rankings de la pestana "Estadisticas" (Copa). Todos usan la misma forma
// FilaGoleo. La UI decide cuantas filas mostrar (top 5 colapsado + expandir).
export interface Estadisticas {
  goleadores: FilaGoleo[];
  asistidores: FilaGoleo[];
  golesYAsist: FilaGoleo[]; // suma goles + asistencias por jugador
  amarillas: FilaGoleo[];
  rojas: FilaGoleo[];
  penales: FilaGoleo[]; // goles de penal en juego (excluye tandas)
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
  no_pronosticados: number;
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
