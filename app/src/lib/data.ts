// Capa de datos: TODAS las consultas a Supabase viven aca (DRY).
// Cada funcion devuelve ya los tipos del dominio (ver types.ts), mapeando
// las filas crudas de Postgres. Los ids serial (number) se pasan a string
// para encajar con los tipos del frontend sin tocar las pantallas.
import { supabase } from "./supabase";
import type {
  EstadoPartido,
  Especiales,
  EspecialesConJugador,
  Estadisticas,
  EventoPartido,
  FilaGoleo,
  FilaGrupo,
  FilaTabla,
  FilaTormenta,
  Jugador,
  JugadorAdmin,
MiPrediccion,
  ModoDefinicion,
  LadoEquipo,
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
    alargue_local: r.alargue_local ?? null,
    alargue_visita: r.alargue_visita ?? null,
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
    pred_definicion: r.pred_definicion ?? null,
    pred_def_local: r.pred_def_local ?? null,
    pred_def_visita: r.pred_def_visita ?? null,
    puntos_definicion: Number(r.puntos_definicion ?? 0),
    pred_clasificado: r.pred_clasificado ?? null,
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
// La prediccion de definicion del empate (modo + marcador) es opcional y solo
// aplica en eliminatoria; en grupos el servidor la ignora.
export async function guardarPronostico(
  jugadorId: string,
  partidoId: string,
  local: number,
  visita: number,
  definicion: ModoDefinicion | null = null,
  defLocal: number | null = null,
  defVisita: number | null = null,
  clasificado: LadoEquipo | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc("guardar_pronostico", {
    p_jugador_id: Number(jugadorId),
    p_partido_id: Number(partidoId),
    p_local: local,
    p_visita: visita,
    p_definicion: definicion,
    p_def_local: defLocal,
    p_def_visita: defVisita,
    p_clasificado: clasificado,
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

// Estadisticas individuales del torneo (pestana "Estadisticas" dentro de Copa),
// agregadas desde partido_eventos en el cliente (son ~pocos cientos de eventos
// en todo el Mundial; no amerita una vista SQL).
//
// Devuelve los rankings COMPLETOS (sin cortar) para que la UI decida cuantos
// mostrar (top 5 colapsado + "ver lista completa").
//
// Reglas de conteo:
//   - goleadores:  tipo=gol, excluye autogoles.
//   - asistidores: tipo=gol, cuenta por 'asistencia'.
//   - golesYAsist: goleadores + asistidores fusionados por jugador.
//   - amarillas / rojas: tipo=amarilla / tipo=roja, cuenta por jugador.
//   - penales:     tipo=gol AND detalle=penal (los de tanda son tipo=penal_tanda
//                  y quedan fuera solos por el filtro).
export async function obtenerEstadisticas(): Promise<Estadisticas> {
  // Traemos tambien el lado (equipo) y el pais de cada lado del partido, para
  // poder pintar la bandera del jugador. partido_eventos -> partidos es FK.
  // Filtramos por los 3 tipos que alimentan tablas (cambios y penal_tanda no).
  const { data, error } = await supabase
    .from("partido_eventos")
    .select("tipo, jugador, asistencia, detalle, equipo, partidos(pais_local, pais_visita)")
    .in("tipo", ["gol", "amarilla", "roja"]);
  lanzarSi(error);

  // Desempate por "hasta donde llego la seleccion del jugador": traemos la fase
  // de cada partido junto con los paises que la disputaron y nos quedamos, por
  // pais, con la fase MAS AVANZADA en la que aparece. Rank mayor = llego mas
  // lejos en el torneo. En eliminatorias el pais solo esta cargado si clasifico
  // a esa ronda, asi que "aparece en fase X" == "llego a la fase X".
  const RANK_FASE: Record<string, number> = {
    "Grupos": 1,
    "Dieciseisavos": 2,
    "Octavos": 3,
    "Cuartos": 4,
    "Semifinales": 5,
    "Tercer Puesto": 5, // jugar el 3er puesto == haber llegado a semifinales
    "Final": 6,
  };
  const { data: parts, error: errParts } = await supabase
    .from("partidos")
    .select("fase, pais_local, pais_visita");
  lanzarSi(errParts);

  // pais ISO -> rank de la fase mas avanzada donde aparece esa seleccion.
  const faseMaxPais = new Map<string, number>();
  const registrarFase = (pais: string | null, fase: string) => {
    if (!pais) return;
    const rank = RANK_FASE[fase] ?? 0;
    if (rank > (faseMaxPais.get(pais) ?? 0)) faseMaxPais.set(pais, rank);
  };
  for (const p of (parts ?? []) as any[]) {
    registrarFase(p.pais_local, p.fase);
    registrarFase(p.pais_visita, p.fase);
  }
  const faseDe = (pais: string | null): number =>
    pais ? faseMaxPais.get(pais) ?? 0 : 0;

  // Clave canonica: une las dos grafias del MISMO jugador ("K. Mbappé" y
  // "Kylian Mbappé") agrupando por inicial-del-primer-nombre + apellido, sin
  // tildes. Asi la tabla no cuenta doble a quien quedo con nombre abreviado en
  // algun partido no enriquecido por Highlightly. Se muestra la grafia mas
  // larga vista (la completa). Riesgo de colision (misma inicial+apellido) es
  // despreciable en un Mundial.
  const claveCanonica = (nombre: string): string => {
    const limpio = nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita tildes
      .toLowerCase()
      .replace(/\./g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const partes = limpio.split(" ").filter(Boolean);
    if (partes.length <= 1) return limpio;
    return `${partes[0][0]} ${partes[partes.length - 1]}`; // inicial + apellido
  };

  // clave -> { total, pais, nombre }. pais y nombre se fijan/mejoran al vuelo.
  type Acum = { total: number; pais: string | null; nombre: string };
  const nuevoMapa = () => new Map<string, Acum>();
  const goles = nuevoMapa();
  const asist = nuevoMapa();
  const combo = nuevoMapa();
  const amarillas = nuevoMapa();
  const rojas = nuevoMapa();
  const penales = nuevoMapa();

  const sumar = (m: Map<string, Acum>, nombre: string, pais: string | null) => {
    const clave = claveCanonica(nombre);
    const cur = m.get(clave) ?? { total: 0, pais: null, nombre };
    cur.total += 1;
    if (!cur.pais && pais) cur.pais = pais;
    if (nombre.length > cur.nombre.length) cur.nombre = nombre; // grafia mas completa
    m.set(clave, cur);
  };

  for (const r of (data ?? []) as any[]) {
    const part = Array.isArray(r.partidos) ? r.partidos[0] : r.partidos;
    const pais =
      r.equipo === "local"
        ? part?.pais_local ?? null
        : part?.pais_visita ?? null;
    if (r.tipo === "gol") {
      if (r.jugador && r.detalle !== "autogol") {
        sumar(goles, r.jugador, pais);
        sumar(combo, r.jugador, pais);
      }
      if (r.asistencia) {
        sumar(asist, r.asistencia, pais);
        sumar(combo, r.asistencia, pais);
      }
      if (r.jugador && r.detalle === "penal") {
        sumar(penales, r.jugador, pais);
      }
    } else if (r.tipo === "amarilla" && r.jugador) {
      sumar(amarillas, r.jugador, pais);
    } else if (r.tipo === "roja" && r.jugador) {
      sumar(rojas, r.jugador, pais);
    }
  }

  // Orden: 1) mas eventos (goles/asist/etc), 2) DESEMPATE: la seleccion que
  // llego mas lejos en el torneo va primero, 3) alfabetico (ultimo recurso).
  const ordenar = (m: Map<string, Acum>): FilaGoleo[] =>
    [...m.values()]
      .map((v) => ({ jugador: v.nombre, total: v.total, pais: v.pais }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          faseDe(b.pais) - faseDe(a.pais) ||
          a.jugador.localeCompare(b.jugador)
      );

  return {
    goleadores: ordenar(goles),
    asistidores: ordenar(asist),
    golesYAsist: ordenar(combo),
    amarillas: ordenar(amarillas),
    rojas: ordenar(rojas),
    penales: ordenar(penales),
  };
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
  alargue_local: number | null; // goles SOLO del alargue (manual)
  alargue_visita: number | null;
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

// ---------- PRONOSTICO SANDBOX ("que pasaria si") ----------

// Guarda (o resetea, si campeon es null) el campeon elegido por el jugador en
// el sandbox. Solo esto se persiste en Supabase; el resto del cuadro vive en
// localStorage. Alimenta la cajita de "pais mas elegido por todos".
export async function guardarSandboxCampeon(
  jugadorId: string,
  campeon: string | null,
  campeonPais: string | null
): Promise<void> {
  const { error } = await supabase.rpc("guardar_sandbox_campeon", {
    p_jugador_id: Number(jugadorId),
    p_campeon: campeon,
    p_campeon_pais: campeonPais,
  });
  lanzarSi(error);
}

// Una fila del agregado de campeones del sandbox (para las barras de %).
export interface VotoCampeon {
  campeon: string;
  pais: string | null;
  votos: number;
}

// Cuantos jugadores eligieron cada pais como campeon en su sandbox, de mas a
// menos votado. El % lo calcula la UI sobre la suma total.
export async function obtenerSandboxCampeones(): Promise<VotoCampeon[]> {
  const { data, error } = await supabase.rpc("sandbox_campeones_agg");
  lanzarSi(error);
  return ((data ?? []) as any[]).map((r) => ({
    campeon: r.campeon,
    pais: r.campeon_pais ?? null,
    votos: Number(r.votos),
  }));
}
