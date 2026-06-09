// Capa de datos: TODAS las consultas a Supabase viven aca (DRY).
// Cada funcion devuelve ya los tipos del dominio (ver types.ts), mapeando
// las filas crudas de Postgres. Los ids serial (number) se pasan a string
// para encajar con los tipos del frontend sin tocar las pantallas.
import { supabase } from "./supabase";
import type {
  EstadoPartido,
  Especiales,
  EventoPartido,
  FilaGrupo,
  FilaTabla,
  Jugador,
  Partido,
  PronosticoVista,
  TipoEvento,
} from "./types";

// ---------- mappers (fila cruda -> tipo del dominio) ----------

function aJugador(r: any): Jugador {
  return {
    id: String(r.id),
    nombre: r.nombre,
    alias: r.alias ?? null,
    es_admin: !!r.es_admin,
    avatar_pos1: r.avatar_pos1 ?? null,
    avatar_medio: r.avatar_medio ?? null,
    avatar_pos8: r.avatar_pos8 ?? null,
  };
}

function aPartido(r: any): Partido {
  return {
    id: String(r.id),
    fase: r.fase,
    grupo: r.grupo ?? null,
    fecha: r.fecha,
    estadio: r.estadio ?? null,
    ciudad: r.ciudad ?? null,
    equipo_local: r.equipo_local,
    equipo_visita: r.equipo_visita,
    pais_local: r.pais_local ?? "",
    pais_visita: r.pais_visita ?? "",
    goles_local: r.goles_local,
    goles_visita: r.goles_visita,
    minuto: r.minuto ?? null,
    penales_local: r.penales_local ?? null,
    penales_visita: r.penales_visita ?? null,
    ganador_penales: r.ganador_penales ?? null,
    estado: r.estado,
  };
}

function aEvento(r: any): EventoPartido {
  return {
    id: String(r.id),
    partido_id: String(r.partido_id),
    tipo: r.tipo,
    equipo: r.equipo,
    minuto: r.minuto,
    jugador: r.jugador ?? null,
    asistencia: r.asistencia ?? null,
    detalle: r.detalle ?? null,
  };
}

function aPronosticoVista(r: any): PronosticoVista {
  return {
    jugador_id: String(r.jugador_id),
    nombre: r.nombre,
    pred_local: r.pred_local,
    pred_visita: r.pred_visita,
    puntos: Number(r.puntos ?? 0),
  };
}

function aFilaTabla(r: any): FilaTabla {
  return {
    jugador_id: String(r.jugador_id),
    nombre: r.nombre,
    alias: r.alias ?? null,
    posicion: r.posicion,
    puntos: r.puntos,
    exactos: r.exactos,
    aciertos: r.aciertos,
    fallas: r.fallas,
    avatar_pos1: r.avatar_pos1 ?? null,
    avatar_medio: r.avatar_medio ?? null,
    avatar_pos8: r.avatar_pos8 ?? null,
  };
}

function aFilaGrupo(r: any): FilaGrupo {
  return {
    grupo: r.grupo,
    pais: r.pais ?? "",
    equipo: r.equipo,
    pj: Number(r.pj ?? 0),
    pg: Number(r.pg ?? 0),
    pe: Number(r.pe ?? 0),
    pp: Number(r.pp ?? 0),
    gf: Number(r.gf ?? 0),
    gc: Number(r.gc ?? 0),
    dg: Number(r.dg ?? 0),
    pts: Number(r.pts ?? 0),
    pos: Number(r.pos ?? 0),
  };
}

// ---------- helper de error ----------

function lanzarSi(error: unknown) {
  if (error) throw error;
}

// ---------- consultas ----------

/** Lista para el dropdown del login (sin exponer el pin_hash). */
export async function listarJugadores(): Promise<Jugador[]> {
  const { data, error } = await supabase
    .from("jugadores_publico")
    .select("*")
    .order("id");
  lanzarSi(error);
  return (data ?? []).map(aJugador);
}

/** Valida el PIN via RPC segura. Devuelve el jugador o null si no calza. */
export async function loginJugador(
  jugadorId: string,
  pin: string
): Promise<Jugador | null> {
  const { data, error } = await supabase.rpc("login_jugador", {
    p_jugador_id: Number(jugadorId),
    p_pin: pin,
  });
  lanzarSi(error);
  const fila = Array.isArray(data) ? data[0] : data;
  return fila ? aJugador(fila) : null;
}

export async function listarPartidos(): Promise<Partido[]> {
  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .order("fecha");
  lanzarSi(error);
  return (data ?? []).map(aPartido);
}

export async function obtenerPartido(id: string): Promise<Partido | null> {
  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  lanzarSi(error);
  return data ? aPartido(data) : null;
}

export async function listarEventos(partidoId: string): Promise<EventoPartido[]> {
  const { data, error } = await supabase
    .from("partido_eventos")
    .select("*")
    .eq("partido_id", Number(partidoId))
    .order("minuto", { ascending: false });
  lanzarSi(error);
  return (data ?? []).map(aEvento);
}

// Pronosticos de un partido (via RPC: oculta ajenos hasta que empieza).
export async function pronosticosPartido(
  partidoId: string,
  jugadorId: string
): Promise<PronosticoVista[]> {
  const { data, error } = await supabase.rpc("pronosticos_partido", {
    p_partido_id: Number(partidoId),
    p_jugador_id: Number(jugadorId),
  });
  lanzarSi(error);
  return (data ?? []).map(aPronosticoVista);
}

// Guarda/actualiza el pronostico del jugador. Devuelve 'ok'|'cerrado'|'invalido'.
export async function guardarPronostico(
  jugadorId: string,
  partidoId: string,
  local: number,
  visita: number
): Promise<string> {
  const { data, error } = await supabase.rpc("guardar_pronostico", {
    p_jugador_id: Number(jugadorId),
    p_partido_id: Number(partidoId),
    p_local: local,
    p_visita: visita,
  });
  lanzarSi(error);
  return String(data);
}

export async function obtenerTabla(): Promise<FilaTabla[]> {
  const { data, error } = await supabase
    .from("tabla_posiciones")
    .select("*")
    .order("posicion");
  lanzarSi(error);
  return (data ?? []).map(aFilaTabla);
}

export async function obtenerTablaGrupos(): Promise<FilaGrupo[]> {
  const { data, error } = await supabase
    .from("tabla_grupos")
    .select("*")
    .order("grupo")
    .order("pos");
  lanzarSi(error);
  return (data ?? []).map(aFilaGrupo);
}

// ---------- ADMIN: cargar resultados y eventos ----------
// La app gatea esto a es_admin; las tablas tienen escritura abierta al grupo.

export interface ResultadoInput {
  estado: EstadoPartido;
  goles_local: number | null;
  goles_visita: number | null;
  minuto: number | null;
  penales_local: number | null;
  penales_visita: number | null;
  ganador_penales: "local" | "visita" | null;
}

export async function guardarResultado(
  partidoId: string,
  r: ResultadoInput
): Promise<void> {
  const { error } = await supabase
    .from("partidos")
    .update(r)
    .eq("id", Number(partidoId));
  lanzarSi(error);
}

export interface EventoInput {
  partido_id: string;
  tipo: TipoEvento;
  equipo: "local" | "visita";
  minuto: number;
  jugador: string | null;
  detalle: string | null;
}

export async function agregarEvento(e: EventoInput): Promise<void> {
  const { error } = await supabase.from("partido_eventos").insert({
    partido_id: Number(e.partido_id),
    tipo: e.tipo,
    equipo: e.equipo,
    minuto: e.minuto,
    jugador: e.jugador,
    detalle: e.detalle,
  });
  lanzarSi(error);
}

export async function eliminarEvento(id: string): Promise<void> {
  const { error } = await supabase
    .from("partido_eventos")
    .delete()
    .eq("id", Number(id));
  lanzarSi(error);
}

// ---------- CUENTA ----------
export async function actualizarAlias(
  jugadorId: string,
  alias: string
): Promise<void> {
  const { error } = await supabase.rpc("actualizar_alias", {
    p_jugador_id: Number(jugadorId),
    p_alias: alias,
  });
  lanzarSi(error);
}

// Devuelve true si el PIN actual era correcto y se cambio.
export async function cambiarPin(
  jugadorId: string,
  actual: string,
  nuevo: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("cambiar_pin", {
    p_jugador_id: Number(jugadorId),
    p_pin_actual: actual,
    p_pin_nuevo: nuevo,
  });
  lanzarSi(error);
  return data === true;
}

// ---------- PREDICCIONES ESPECIALES ----------
export async function prediccionesHabilitadas(): Promise<boolean> {
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "edicion_predicciones_habilitada")
    .maybeSingle();
  lanzarSi(error);
  return data?.valor === "true";
}

export async function setPrediccionesHabilitadas(on: boolean): Promise<void> {
  const { error } = await supabase
    .from("configuracion")
    .update({ valor: on ? "true" : "false", updated_at: new Date().toISOString() })
    .eq("clave", "edicion_predicciones_habilitada");
  lanzarSi(error);
}

export async function misEspeciales(
  jugadorId: string
): Promise<Especiales | null> {
  const { data, error } = await supabase
    .from("predicciones_especiales")
    .select(
      "campeon, finalista_1, finalista_2, semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4, goleador, mejor_jugador, mejor_arquero, mejor_joven"
    )
    .eq("jugador_id", Number(jugadorId))
    .maybeSingle();
  lanzarSi(error);
  return (data as Especiales) ?? null;
}

// Guarda especiales (RPC valida la ventana). Devuelve 'ok' | 'cerrado'.
export async function guardarEspeciales(
  jugadorId: string,
  e: Especiales
): Promise<string> {
  const { data, error } = await supabase.rpc("guardar_especiales", {
    p_jugador_id: Number(jugadorId),
    p_campeon: e.campeon,
    p_finalista_1: e.finalista_1,
    p_finalista_2: e.finalista_2,
    p_semi_1: e.semifinalista_1,
    p_semi_2: e.semifinalista_2,
    p_semi_3: e.semifinalista_3,
    p_semi_4: e.semifinalista_4,
    p_goleador: e.goleador,
    p_mejor_jugador: e.mejor_jugador,
    p_mejor_arquero: e.mejor_arquero,
    p_mejor_joven: e.mejor_joven,
  });
  lanzarSi(error);
  return String(data);
}

// Lista de equipos reales (para los selects). Excluye 'Por definir'.
export async function equiposReales(): Promise<string[]> {
  const { data, error } = await supabase
    .from("partidos")
    .select("equipo_local, equipo_visita")
    .neq("equipo_local", "Por definir");
  lanzarSi(error);
  const set = new Set<string>();
  for (const r of data ?? []) {
    if (r.equipo_local && r.equipo_local !== "Por definir") set.add(r.equipo_local);
    if (r.equipo_visita && r.equipo_visita !== "Por definir") set.add(r.equipo_visita);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
