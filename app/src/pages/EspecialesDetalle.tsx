// =====================================================================
// EspecialesDetalle.tsx  ·  /especiales/:jugadorId
// =====================================================================
// Detalle completo de las predicciones especiales de UN jugador:
//   - Cabecera con el total EN VIVO (vista especiales_puntos).
//   - Banderas del pick (campeon/finalistas/semis) con badge de ronda lograda.
//   - DESGLOSE de puntos categoria por categoria (cuanto va sumando provisorio).
//     Goleador/Asistidor se enganchan a la tabla REAL de goleo (goles/asist.
//     acumulados + si va liderando).
//
// PROVISORIO: mientras no se juegue la final (slot P104), los puntos se ven pero
// NO cuentan en el ranking oficial. Se avisa con un banner.
//
// Guardrail: si la ventana de edicion sigue abierta, solo puedes ver TU propio
// detalle.
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Flag from "../components/Flag";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { codigoPais, mapaEquipoPais, type MapaEquipoPais } from "../lib/banderas";
import {
  rondaPais,
  situacionGoleo,
  hayUnico,
  puntosDistincionUnico,
  type SituacionGoleo,
} from "../lib/especiales";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  obtenerEstadisticas,
  obtenerTabla,
  prediccionesHabilitadas,
  puntosEspeciales,
  resultadosRealesEspeciales,
  todasEspeciales,
} from "../lib/data";
import type {
  EspecialesConJugador,
  EspecialesPuntos,
  EspecialesReales,
  Estadisticas,
  FilaTabla,
} from "../lib/types";

const REALES_VACIO: EspecialesReales = {
  campeon: null,
  tercer: null,
  finalistas: [],
  semifinalistas: [],
  goleadores: [],
  asistidores: [],
  mejor_jugador: null,
  mejor_arquero: null,
  mejor_joven: null,
};

export default function EspecialesDetalle() {
  const navigate = useNavigate();
  const { jugadorId } = useParams();
  const { jugador } = useAuth();

  const { data: filas } = useAsync(obtenerTabla, []);
  const { data: especiales } = useAsync(todasEspeciales, []);
  const { data: puntos } = useAsync(puntosEspeciales, []);
  const { data: partidos } = useAsync(listarPartidos, []);
  const { data: reales } = useAsync(resultadosRealesEspeciales, []);
  const { data: stats } = useAsync(obtenerEstadisticas, []);
  const { data: ventanaAbierta } = useAsync(prediccionesHabilitadas, []);

  const mapa = useMemo(() => mapaEquipoPais(partidos ?? []), [partidos]);
  const filasOrdenadas = filas ?? [];
  const total = filasOrdenadas.length;

  // ¿La final ya se jugo? Entonces los especiales cuentan oficialmente.
  const finalJugada = useMemo(
    () => (partidos ?? []).some((p) => p.slot === "P104" && p.estado === "final"),
    [partidos]
  );

  const fila = filasOrdenadas.find((f) => f.jugador_id === jugadorId) ?? null;
  const e =
    ((especiales ?? []) as EspecialesConJugador[]).find(
      (x) => x.jugador_id === jugadorId
    ) ?? null;
  const misPuntos = puntos?.get(jugadorId ?? "") ?? null;

  const esYo = !!jugador && jugadorId === String(jugador.id);
  const bloqueado = ventanaAbierta === true && !esYo;

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold truncate">
          Especiales de {fila?.alias ?? fila?.nombre ?? "participante"}
        </h1>
      </header>

      {bloqueado ? (
        <p className="px-4 text-neutral-300 text-sm">
          Las predicciones de los demás se revelan cuando cierre la ventana de
          edición.
        </p>
      ) : !fila ? (
        <p className="px-4 text-neutral-400 text-sm">Cargando...</p>
      ) : (
        <>
          {!finalJugada && (
            <div className="mx-4 mb-4 rounded-xl border border-oro/40 bg-oro/10 px-3 py-2 text-xs text-oro">
              Puntaje <b>provisorio</b>: se oficializa (y suma al ranking) cuando
              se juegue la final.
            </div>
          )}
          <Detalle
            fila={fila}
            total={total}
            e={e}
            puntos={misPuntos}
            mapa={mapa}
            reales={reales ?? REALES_VACIO}
            stats={stats ?? null}
          />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Detalle jugador
function Detalle({
  fila,
  total,
  e,
  puntos,
  mapa,
  reales,
  stats,
}: {
  fila: FilaTabla;
  total: number;
  e: EspecialesConJugador | null;
  puntos: EspecialesPuntos | null;
  mapa: MapaEquipoPais;
  reales: EspecialesReales;
  stats: Estadisticas | null;
}) {
  const finalistas = [e?.finalista_1, e?.finalista_2];
  const semis = [e?.semifinalista_1, e?.semifinalista_2, e?.semifinalista_3, e?.semifinalista_4];
  const totalPts = puntos?.puntos_total ?? 0;

  return (
    <section className="px-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-oro/40 bg-carbon-card px-4 py-3">
        <span className="text-sm font-semibold text-neutral-300">Puntos especiales</span>
        <span className="text-2xl font-black tabular-nums text-oro">{totalPts}</span>
      </div>

      {!e ? (
        <p className="text-sm text-neutral-400">
          Este participante no dejó predicciones especiales.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-borde bg-carbon-card p-4">
            <div className="flex-1 min-w-0">
              <Avatar
                src={avatarPorPosicion(fila, total)}
                nombre={fila.nombre}
                variante={bordePorPosicion(fila.posicion, total)}
                fill
              />
            </div>
            <div className="shrink-0 flex flex-col gap-3">
              <BloqueEquipos titulo="Campeón" equipos={[e.campeon]} mapa={mapa} reales={reales} campeon />
              <BloqueEquipos titulo="Finalistas" equipos={finalistas} mapa={mapa} reales={reales} />
              <BloqueEquipos titulo="Semifinalistas" equipos={semis} mapa={mapa} reales={reales} size={30} />
            </div>
          </div>

          <Desglose e={e} puntos={puntos} reales={reales} stats={stats} totalPts={totalPts} />
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------ Desglose de puntos
// Tabla propia del jugador: cuanto suma cada categoria (provisorio).
function Desglose({
  e,
  puntos,
  reales,
  stats,
  totalPts,
}: {
  e: EspecialesConJugador;
  puntos: EspecialesPuntos | null;
  reales: EspecialesReales;
  stats: Estadisticas | null;
  totalPts: number;
}) {
  // Cuantos de los 7 picks de pais estan hoy en zona de puntos.
  const picksPais = [
    e.campeon, e.finalista_1, e.finalista_2,
    e.semifinalista_1, e.semifinalista_2, e.semifinalista_3, e.semifinalista_4,
  ];
  const enZona = picksPais.filter((t) => rondaPais(t ?? null, reales)).length;
  const totalPicksPais = picksPais.filter((t) => !!t).length;

  const sitGol = situacionGoleo(e.goleador, stats?.goleadores ?? []);
  const sitAsi = situacionGoleo(e.asistidor, stats?.asistidores ?? []);

  const filas: FilaDesglose[] = [
    {
      cat: "País (campeón, finalistas, semis, 3ro)",
      detalle: totalPicksPais
        ? `${enZona}/${totalPicksPais} en zona de puntos`
        : "sin picks",
      pts: puntos?.puntos_pais ?? 0,
      estado: (puntos?.puntos_pais ?? 0) > 0 ? "suma" : "pendiente",
    },
    filaGoleo("Goleador", e.goleador, sitGol, "goles", puntos?.puntos_goleador ?? 0),
    filaGoleo("Asistidor", e.asistidor, sitAsi, "asist.", puntos?.puntos_asistidor ?? 0),
    filaUnico("Mejor jugador", e.mejor_jugador, reales.mejor_jugador, puntos?.puntos_mejor_jugador ?? 0),
    filaUnico("Mejor arquero", e.mejor_arquero, reales.mejor_arquero, puntos?.puntos_mejor_arquero ?? 0),
    filaUnico("Mejor joven", e.mejor_joven, reales.mejor_joven, puntos?.puntos_mejor_joven ?? 0),
  ];

  return (
    <div className="rounded-2xl border border-borde bg-carbon-card overflow-hidden">
      <h2 className="px-4 pt-3 pb-2 text-sm font-bold text-oro uppercase tracking-wide">
        Cómo va sumando
      </h2>
      <ul>
        {filas.map((f) => (
          <li key={f.cat} className="flex items-center gap-3 px-4 py-2.5 border-t border-borde/40">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotEstado(f.estado)}`} aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold leading-tight truncate">{f.cat}</span>
              <span className="block text-[11px] text-neutral-400 leading-tight truncate">{f.detalle}</span>
            </span>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${f.pts > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
              {f.pts > 0 ? `+${f.pts}` : "—"}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-3 px-4 py-3 border-t border-oro/40 bg-oro/5">
          <span className="flex-1 text-sm font-bold">Total provisorio</span>
          <span className="shrink-0 text-base font-black tabular-nums text-oro">{totalPts}</span>
        </li>
      </ul>
    </div>
  );
}

interface FilaDesglose {
  cat: string;
  detalle: string;
  pts: number;
  estado: "suma" | "pendiente" | "falla";
}

// Fila de goleador/asistidor enganchada al ranking real de goleo.
function filaGoleo(
  cat: string,
  pick: string | null,
  sit: SituacionGoleo | null,
  unidad: string,
  pts: number
): FilaDesglose {
  if (!pick) return { cat, detalle: "sin elegir", pts, estado: "pendiente" };
  if (!sit || sit.total === 0) {
    return { cat, detalle: `${pick} · sin ${unidad} aún`, pts, estado: "pendiente" };
  }
  const cola = sit.esLider ? "líder" : `a ${sit.aDelLider} del líder`;
  return {
    cat,
    detalle: `${pick} · ${sit.total} ${unidad} · ${cola}`,
    pts,
    estado: pts > 0 ? "suma" : "pendiente",
  };
}

// Fila de distincion manual (mejor jugador/arquero/joven).
function filaUnico(
  cat: string,
  pick: string | null,
  real: string | null,
  pts: number
): FilaDesglose {
  if (!pick) return { cat, detalle: "sin elegir", pts, estado: "pendiente" };
  if (!hayUnico(real)) return { cat, detalle: `${pick} · aún sin definir`, pts, estado: "pendiente" };
  const acerto = puntosDistincionUnico(pick, real, 1) > 0;
  return {
    cat,
    detalle: `${pick} · ${acerto ? "acertado" : "no acertado"}`,
    pts,
    estado: acerto ? "suma" : "falla",
  };
}

function dotEstado(estado: FilaDesglose["estado"]): string {
  if (estado === "suma") return "bg-emerald-400";
  if (estado === "falla") return "bg-rose-500";
  return "bg-neutral-500";
}

// ------------------------------------------------------------ Banderas
function BloqueEquipos({
  titulo,
  equipos,
  mapa,
  reales,
  campeon,
  size = 44,
}: {
  titulo: string;
  equipos: (string | null | undefined)[];
  mapa: MapaEquipoPais;
  reales: EspecialesReales;
  campeon?: boolean;
  size?: number;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{titulo}</h3>
      <div className="flex flex-wrap gap-2">
        {equipos.map((t, i) => (
          <BanderaEtiqueta key={i} mapa={mapa} equipo={t ?? null} campeon={campeon} size={size} reales={reales} />
        ))}
      </div>
    </div>
  );
}

function BanderaEtiqueta({
  mapa,
  equipo,
  campeon,
  size = 44,
  reales,
}: {
  mapa: MapaEquipoPais;
  equipo: string | null;
  campeon?: boolean;
  size?: number;
  reales: EspecialesReales;
}) {
  const ancho = size + 16;
  const altoPlaceholder = Math.round((size * 31) / 44);
  if (!equipo) {
    return (
      <div className="flex flex-col items-center gap-1" style={{ width: ancho }}>
        <div
          className="rounded-lg border border-dashed border-borde bg-carbon-soft"
          style={{ width: size, height: altoPlaceholder }}
        />
        <span className="text-[10px] text-neutral-500">Sin elegir</span>
      </div>
    );
  }
  const ronda = rondaPais(equipo, reales);
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: ancho }}>
      <div className={campeon ? "rounded-lg ring-2 ring-oro p-0.5" : ""}>
        <Flag code={codigoPais(mapa, equipo)} nombre={equipo} size={size} rect />
      </div>
      <span className="text-[10px] text-center leading-tight text-neutral-200 line-clamp-2">
        {equipo}
      </span>
      {ronda && (
        <span className="rounded-full bg-emerald-500/15 px-1.5 text-[9px] font-bold text-emerald-400 leading-relaxed">
          {ronda.label} +{ronda.pts}
        </span>
      )}
    </div>
  );
}
