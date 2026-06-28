// Capa de datos: TODAS las consultas a Supabase viven aca (DRY).
// Cada funcion devuelve ya los tipos del dominio (ver types.ts), mapeando
// las filas crudas de Postgres. Los ids serial (number) se pasan a string
// para encajar con los tipos del frontend sin tocar las pantallas.
import { supabase } from "./supabase";
import type {
  EstadoPartido,
  Especiales,
  EspecialesConJugador,
  EventoPartido,
  FilaGoleo,
  FilaGrupo,
  FilaTabla,
  FilaTormenta,
  Jugador,
  JugadorAdmin,
MiPrediccion,
  Partido,
  PrediccionJugada,
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
    slot: r.slot ?? null,
    origen_local: r.origen_local ?? null,
    origen_visita: r.origen_visita ?? null,
    equipos_bloqueados: r.equipos_bloqueados ?? false,
    fecha: r.fecha,
    estadio: r.estadio ?? null,
    ciudad: r.ciudad ?? null,
    equipo_local: r.equipo_local,
    equipo_visita: r.equipo_visita,
    pais_local: r.pais_local ?? "",
    pais_visita: r.pais_visita ?? "",
    goles_local: r.goles_local,
    goles_visita: r.goles_visita,
    puntaje_anulado: r.puntaje_anulado ?? false,
    tramo: r.tramo ?? null,
    minuto: r.minuto ?? null,
    minuto_at: r.minuto_at ?? null,
    penales_local: r.penales_local ?? null,
    penales_visita: r.penales_visita ?? null,
    ganador_penales: r.ganador_penales ?? null,
    estado: r.estado,
    estadisticas: r.estadisticas ?? null,
    alineaciones: r.alineaciones ?? null,
  };
}

function aEvento(r: any): EventoPartido {
  return {
    id: String(r.id),
    partido_id: String(r.partido_id),
    tipo: r.tipo,
    equipo: r.equipo,
    minuto: r.minuto,
    minuto_adicional: r.minuto_adicional ?? null,
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

// IDs de partidos que el jugador YA pronostico (para etiqueta Pronosticado/Pendiente).
export async function misPronosticos(jugadorId: string): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("mis_pronosticos", {
    p_jugador_id: Number(jugadorId),
  });
  lanzarSi(error);
  return new Set((data ?? []).map((r: any) => String(r.partido_id)));
}

// Mapea una fila cruda (RPC) al tipo MiPrediccion. Compartido por las RPC de
// "mis predicciones" y "predicciones jugadas de cualquiera" (DRY).
function aMiPrediccion(r: any): MiPrediccion {
  return {
    partido_id: String(r.partido_id),
    fase: r.fase,
    grupo: r.grupo ?? null,
    fecha: r.fecha,
    estado: r.estado,
    equipo_local: r.equipo_local,
    equipo_visita: r.equipo_visita,
    pais_local: r.pais_local,
    pais_visita: r.pais_visita,
    goles_local: r.goles_local ?? null,
    goles_visita: r.goles_visita ?? null,
    pred_local: r.pred_local,
    pred_visita: r.pred_visita,
    puntos: r.puntos ?? null,
    resultado: r.resultado ?? null,
  };
}

// Todas MIS predicciones con el detalle del partido, puntos y categoria.
// Solo trae las que yo pronostique (las pendientes no tienen fila).
export async function misPrediccionesDetalle(
  jugadorId: string
): Promise<MiPrediccion[]> {
  const { data, error } = await supabase.rpc("mis_predicciones_detalle", {
    p_jugador_id: Number(jugadorId),
  });
  lanzarSi(error);
  return (data ?? []).map(aMiPrediccion);
}

// Predicciones de partidos YA JUGADOS (final) de TODOS los jugadores. Segura
// (solo finales -> los pronosticos ya son publicos). La usa la pestana "Casi"
// para el ranking y el detalle por jugador.
export async function prediccionesJugadasTodas(): Promise<PrediccionJugada[]> {
  const { data, error } = await supabase.rpc("predicciones_jugadas_todas");
  lanzarSi(error);
  return (data ?? []).map(
    (r: any): PrediccionJugada => ({
      ...aMiPrediccion(r),
      jugador_id: String(r.jugador_id),
    })
  );
}

export async function obtenerTabla(): Promise<FilaTabla[]> {
  const { data, error } = await supabase
    .from("tabla_posiciones")
    .select("*")
    .order("posicion");
  lanzarSi(error);
  return (data ?? []).map(aFilaTabla);
}

// Tabla de posiciones PROVISIONAL (en vivo): incluye los partidos en curso.
// Misma forma que obtenerTabla(); lee la vista espejo tabla_posiciones_live.
export async function obtenerTablaLive(): Promise<FilaTabla[]> {
  const { data, error } = await supabase
    .from("tabla_posiciones_live")
    .select("*")
    .order("posicion");
  lanzarSi(error);
  return (data ?? []).map(aFilaTabla);
}

// Posiciones BASE de jugadores: foto al cierre de la jornada anterior, para
// el indicador de movimiento (flechas que PERSISTEN, no solo en vivo).
// Devuelve un mapa jugador_id -> posicion. Lee la vista tabla_posiciones_base.
export async function obtenerPosicionesBase(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("tabla_posiciones_base")
    .select("jugador_id, posicion");
  lanzarSi(error);
  const m = new Map<string, number>();
  for (const r of data ?? []) m.set(String(r.jugador_id), r.posicion);
  return m;
}

// Posiciones BASE por grupo: foto al cierre de la jornada anterior.
// Devuelve un mapa "grupo|equipo" -> pos. Lee la vista tabla_grupos_base.
export async function obtenerPosicionesGruposBase(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("tabla_grupos_base")
    .select("grupo, equipo, pos");
  lanzarSi(error);
  const m = new Map<string, number>();
  for (const r of data ?? []) m.set(`${r.grupo}|${r.equipo}`, r.pos);
  return m;
}

// Desglose de pronosticos por miembro (pestana LaTormenta del detalle).
// Es global (todos los partidos finalizados), igual en cualquier partido.
export async function obtenerDesgloseTormenta(): Promise<FilaTormenta[]> {
  const { data, error } = await supabase
    .from("desglose_tormenta")
    .select("*")
    .order("posicion");
  lanzarSi(error);
  return (data ?? []).map(
    (r: any): FilaTormenta => ({
      posicion: r.posicion,
      jugador_id: String(r.jugador_id),
      nombre: r.nombre,
      alias: r.alias ?? null,
      exactos: r.exactos ?? 0,
      diferencias: r.diferencias ?? 0,
      aciertos: r.aciertos ?? 0,
      fallas: r.fallas ?? 0,
      no_pronosticados: r.no_pronosticados ?? 0,
      total: r.total ?? 0,
    })
  );
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

// Tabla de grupos PROVISIONAL (en vivo): incluye los partidos en curso.
// Misma forma que obtenerTablaGrupos(); lee la vista espejo tabla_grupos_live.
export async function obtenerTablaGruposLive(): Promise<FilaGrupo[]> {
  const { data, error } = await supabase
    .from("tabla_grupos_live")
    .select("*")
    .order("grupo")
    .order("pos");
  lanzarSi(error);
  return (data ?? []).map(aFilaGrupo);
}

// Top goleadores y asistidores, agregados desde partido_eventos en el cliente
// (son ~pocos cientos de eventos en todo el Mundial; no amerita una vista SQL).
// Goles: cuenta por 'jugador' excluyendo autogoles. Asist.: cuenta por 'asistencia'.
export async function obtenerGoleo(
  topN = 5
): Promise<{ goleadores: FilaGoleo[]; asistidores: FilaGoleo[] }> {
  // Traemos tambien el lado (equipo) y el pais de cada lado del partido, para
  // poder pintar la bandera del jugador. partido_eventos -> partidos es FK.
  const { data, error } = await supabase
    .from("partido_eventos")
    .select("jugador, asistencia, detalle, equipo, partidos(pais_local, pais_visita)")
    .eq("tipo", "gol");
  lanzarSi(error);

  // jugador -> { total, pais }. El pais se fija en la primera aparicion.
  const goles = new Map<string, { total: number; pais: string | null }>();
  const asist = new Map<string, { total: number; pais: string | null }>();
  const sumar = (
    m: Map<string, { total: number; pais: string | null }>,
    nombre: string,
    pais: string | null
  ) => {
    const cur = m.get(nombre) ?? { total: 0, pais: null };
    cur.total += 1;
    if (!cur.pais && pais) cur.pais = pais;
    m.set(nombre, cur);
  };

  for (const r of (data ?? []) as any[]) {
    const part = Array.isArray(r.partidos) ? r.partidos[0] : r.partidos;
    const pais =
      r.equipo === "local"
        ? part?.pais_local ?? null
        : part?.pais_visita ?? null;
    if (r.jugador && r.detalle !== "autogol") sumar(goles, r.jugador, pais);
    if (r.asistencia) sumar(asist, r.asistencia, pais);
  }

  const ordenar = (
    m: Map<string, { total: number; pais: string | null }>
  ): FilaGoleo[] =>
    [...m.entries()]
      .map(([jugador, v]) => ({ jugador, total: v.total, pais: v.pais }))
      .sort((a, b) => b.total - a.total || a.jugador.localeCompare(b.jugador))
      .slice(0, topN);

  return { goleadores: ordenar(goles), asistidores: ordenar(asist) };
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

// ADMIN (eliminatoria): fija/corrige los equipos de una llave a mano.
// Marca equipos_bloqueados=true para que propagar_llaves() no los pise.
export interface EquiposInput {
  equipo_local: string;
  pais_local: string;
  equipo_visita: string;
  pais_visita: string;
  equipos_bloqueados: boolean;
}

export async function guardarEquipos(
  partidoId: string,
  e: EquiposInput
): Promise<void> {
  const { error } = await supabase
    .from("partidos")
    .update(e)
    .eq("id", Number(partidoId));
  lanzarSi(error);
}

// Re-dispara el motor de llaves (rellena lo que ya se pueda resolver).
// Devuelve cuantos lados se rellenaron en esta corrida.
export async function propagarLlaves(): Promise<number> {
  const { data, error } = await supabase.rpc("propagar_llaves");
  lanzarSi(error);
  return Number(data ?? 0);
}

export interface EventoInput {
  partido_id: string;
  tipo: TipoEvento;
  equipo: "local" | "visita";
  minuto: number;
  minuto_adicional: number | null;
  jugador: string | null;
  asistencia: string | null;
  detalle: string | null;
}

export async function agregarEvento(e: EventoInput): Promise<void> {
  const { error } = await supabase.from("partido_eventos").insert({
    partido_id: Number(e.partido_id),
    tipo: e.tipo,
    equipo: e.equipo,
    minuto: e.minuto,
    minuto_adicional: e.minuto_adicional,
    jugador: e.jugador,
    asistencia: e.asistencia,
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

// ---------- FOTO DE FONDO DEL ULTIMO LUGAR (toggle admin) ----------
// Lee/escribe la llave 'foto_ultimo_habilitada' (mismo patron que arriba).
export async function fotoUltimoHabilitada(): Promise<boolean> {
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "foto_ultimo_habilitada")
    .maybeSingle();
  lanzarSi(error);
  return data?.valor === "true";
}

export async function setFotoUltimoHabilitada(on: boolean): Promise<void> {
  const { error } = await supabase
    .from("configuracion")
    .update({ valor: on ? "true" : "false", updated_at: new Date().toISOString() })
    .eq("clave", "foto_ultimo_habilitada");
  lanzarSi(error);
}

// ---------- FOTO DE FONDO DEL PRIMER LUGAR (toggle admin) ----------
// Lee/escribe la llave 'foto_primero_habilitada' (mismo patron que el ultimo).
export async function fotoPrimeroHabilitada(): Promise<boolean> {
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "foto_primero_habilitada")
    .maybeSingle();
  lanzarSi(error);
  return data?.valor === "true";
}

export async function setFotoPrimeroHabilitada(on: boolean): Promise<void> {
  const { error } = await supabase
    .from("configuracion")
    .update({ valor: on ? "true" : "false", updated_at: new Date().toISOString() })
    .eq("clave", "foto_primero_habilitada");
  lanzarSi(error);
}

export async function misEspeciales(
  jugadorId: string
): Promise<Especiales | null> {
  const { data, error } = await supabase
    .from("predicciones_especiales")
    .select(
      "campeon, finalista_1, finalista_2, semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4, goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven"
    )
    .eq("jugador_id", Number(jugadorId))
    .maybeSingle();
  lanzarSi(error);
  return (data as Especiales) ?? null;
}

// Trae las especiales de TODOS los jugadores (para la pestana piloto que las
// expone en orden de tabla). Devuelve una fila por jugador que tenga guardado.
// El cruce con posicion/avatar se hace en el front contra obtenerTabla().
export async function todasEspeciales(): Promise<EspecialesConJugador[]> {
  const { data, error } = await supabase
    .from("predicciones_especiales")
    .select(
      "jugador_id, campeon, finalista_1, finalista_2, semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4, goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven"
    );
  lanzarSi(error);
  return (data ?? []).map((r: any): EspecialesConJugador => ({
    jugador_id: String(r.jugador_id),
    campeon: r.campeon ?? null,
    finalista_1: r.finalista_1 ?? null,
    finalista_2: r.finalista_2 ?? null,
    semifinalista_1: r.semifinalista_1 ?? null,
    semifinalista_2: r.semifinalista_2 ?? null,
    semifinalista_3: r.semifinalista_3 ?? null,
    semifinalista_4: r.semifinalista_4 ?? null,
    goleador: r.goleador ?? null,
    asistidor: r.asistidor ?? null,
    mejor_jugador: r.mejor_jugador ?? null,
    mejor_arquero: r.mejor_arquero ?? null,
    mejor_joven: r.mejor_joven ?? null,
  }));
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
    p_asistidor: e.asistidor,
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

// ---------- ADMIN: resultados reales de especiales ----------
const CLAVES_REALES = [
  "real_campeon",
  "real_finalista_1",
  "real_finalista_2",
  "real_semi_1",
  "real_semi_2",
  "real_semi_3",
  "real_semi_4",
  "real_tercer",
  "real_goleador",
  "real_asistidor",
  "real_mejor_jugador",
  "real_mejor_arquero",
  "real_mejor_joven",
] as const;
export type ClaveReal = (typeof CLAVES_REALES)[number];

export async function leerResultadosReales(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("configuracion")
    .select("clave, valor")
    .in("clave", [...CLAVES_REALES]);
  lanzarSi(error);
  const out: Record<string, string> = {};
  for (const r of data ?? []) out[r.clave] = r.valor ?? "";
  return out;
}

export async function guardarResultadoReal(
  clave: ClaveReal,
  valor: string
): Promise<void> {
  const { error } = await supabase
    .from("configuracion")
    .update({ valor, updated_at: new Date().toISOString() })
    .eq("clave", clave);
  lanzarSi(error);
}

export async function recalcularEspeciales(): Promise<void> {
  const { error } = await supabase.rpc("recalcular_especiales");
  lanzarSi(error);
}

// ---------- ADMIN: gestion de participantes (baja blanda + ajuste manual) ----------

function aJugadorAdmin(r: any): JugadorAdmin {
  return {
    id: String(r.id),
    nombre: r.nombre,
    alias: r.alias ?? null,
    es_admin: !!r.es_admin,
    activo: !!r.activo,
    ajuste_puntos: Number(r.ajuste_puntos ?? 0),
    ajuste_motivo: r.ajuste_motivo ?? null,
  };
}

// Lista TODOS los jugadores (incluidos los dados de baja) para el panel admin.
export async function listarJugadoresAdmin(): Promise<JugadorAdmin[]> {
  const { data, error } = await supabase.rpc("listar_jugadores_admin");
  lanzarSi(error);
  return (data ?? []).map(aJugadorAdmin);
}

// Da de baja / re-activa a un jugador (baja blanda).
export async function setJugadorActivo(
  jugadorId: string,
  activo: boolean
): Promise<void> {
  const { error } = await supabase.rpc("set_jugador_activo", {
    p_jugador_id: Number(jugadorId),
    p_activo: activo,
  });
  lanzarSi(error);
}

// Ajuste manual de puntos (se suma al total; puede ser negativo).
export async function setAjustePuntos(
  jugadorId: string,
  puntos: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase.rpc("set_ajuste_puntos", {
    p_jugador_id: Number(jugadorId),
    p_puntos: puntos,
    p_motivo: motivo,
  });
  lanzarSi(error);
}
