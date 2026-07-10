// =====================================================================
// EspecialesDetalle.tsx  ·  /especiales/:jugadorId
// =====================================================================
// Detalle completo de las predicciones especiales de UN jugador, con su puntaje
// EN VIVO por categoria (vista especiales_puntos) y el estado de cada pick
// (acertado / pendiente / fallado) contra los resultados reales DERIVADOS solos
// (vista especiales_reales). Debajo, una mini-tabla con el puntaje de especiales
// acumulado de TODOS los participantes.
//
// PROVISORIO: mientras no se juegue la final (slot P104), los puntos se ven pero
// NO cuentan en el ranking oficial. Se avisa con un banner.
//
// Guardrail: si la ventana de edicion sigue abierta, solo puedes ver TU propio
// detalle (mismo criterio que la lista).
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Flag from "../components/Flag";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { codigoPais, mapaEquipoPais, type MapaEquipoPais } from "../lib/banderas";
import {
  rondaPais,
  puntosDistincionSet,
  puntosDistincionUnico,
  haySet,
  hayUnico,
} from "../lib/especiales";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
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
          />
          <MiniTabla
            filas={filasOrdenadas}
            total={total}
            puntos={puntos ?? new Map<string, EspecialesPuntos>()}
            actualId={jugadorId ?? null}
            miId={jugador ? String(jugador.id) : null}
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
}: {
  fila: FilaTabla;
  total: number;
  e: EspecialesConJugador | null;
  puntos: EspecialesPuntos | null;
  mapa: MapaEquipoPais;
  reales: EspecialesReales;
}) {
  const finalistas = [e?.finalista_1, e?.finalista_2];
  const semis = [e?.semifinalista_1, e?.semifinalista_2, e?.semifinalista_3, e?.semifinalista_4];
  const totalPts = puntos?.puntos_total ?? 0;

  // estado por premio: acertado (+pts) / fallado / pendiente.
  const premios = [
    {
      label: "Goleador",
      valor: e?.goleador ?? null,
      pts: puntosDistincionSet(e?.goleador ?? null, reales.goleadores, 15),
      definido: haySet(reales.goleadores),
    },
    {
      label: "Asistidor",
      valor: e?.asistidor ?? null,
      pts: puntosDistincionSet(e?.asistidor ?? null, reales.asistidores, 10),
      definido: haySet(reales.asistidores),
    },
    {
      label: "Mejor jugador",
      valor: e?.mejor_jugador ?? null,
      pts: puntosDistincionUnico(e?.mejor_jugador ?? null, reales.mejor_jugador, 10),
      definido: hayUnico(reales.mejor_jugador),
    },
    {
      label: "Mejor arquero",
      valor: e?.mejor_arquero ?? null,
      pts: puntosDistincionUnico(e?.mejor_arquero ?? null, reales.mejor_arquero, 10),
      definido: hayUnico(reales.mejor_arquero),
    },
    {
      label: "Mejor joven",
      valor: e?.mejor_joven ?? null,
      pts: puntosDistincionUnico(e?.mejor_joven ?? null, reales.mejor_joven, 10),
      definido: hayUnico(reales.mejor_joven),
    },
  ];

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
        <div className="flex flex-col gap-4 rounded-2xl border border-borde bg-carbon-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <Avatar
                src={avatarPorPosicion(fila, total)}
                nombre={fila.nombre}
                variante={bordePorPosicion(fila.posicion, total)}
                fill
              />
            </div>
            <div className="shrink-0 flex flex-col gap-3">
              <BloqueEquipos
                titulo="Campeón"
                subtotal={puntos?.puntos_pais}
                subtotalLabel="País"
                equipos={[e.campeon]}
                mapa={mapa}
                reales={reales}
                campeon
              />
              <BloqueEquipos titulo="Finalistas" equipos={finalistas} mapa={mapa} reales={reales} />
              <BloqueEquipos titulo="Semifinalistas" equipos={semis} mapa={mapa} reales={reales} size={30} />
            </div>
          </div>

          <div className="border-t border-oro/40 pt-3 grid grid-cols-1 gap-2">
            {premios.map((p) => {
              const estado = p.pts > 0 ? "acertado" : p.definido ? "fallado" : "pendiente";
              return <Premio key={p.label} label={p.label} valor={p.valor} pts={p.pts} estado={estado} />;
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// Bloque de banderas con titulo (Campeon / Finalistas / Semis) + estado por pick.
function BloqueEquipos({
  titulo,
  equipos,
  mapa,
  reales,
  campeon,
  size = 44,
  subtotal,
  subtotalLabel,
}: {
  titulo: string;
  equipos: (string | null | undefined)[];
  mapa: MapaEquipoPais;
  reales: EspecialesReales;
  campeon?: boolean;
  size?: number;
  subtotal?: number;
  subtotalLabel?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{titulo}</h3>
        {typeof subtotal === "number" && (
          <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
            {subtotalLabel ? `${subtotalLabel} ` : ""}+{subtotal}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {equipos.map((t, i) => (
          <BanderaEtiqueta key={i} mapa={mapa} equipo={t ?? null} campeon={campeon} size={size} reales={reales} />
        ))}
      </div>
    </div>
  );
}

// Bandera + nombre + badge de ronda lograda (verde) si el equipo ya puntua.
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

// Fila de premio individual con estado y puntos.
function Premio({
  label,
  valor,
  pts,
  estado,
}: {
  label: string;
  valor: string | null;
  pts: number;
  estado: "acertado" | "fallado" | "pendiente";
}) {
  const dot =
    estado === "acertado" ? "bg-emerald-400" : estado === "fallado" ? "bg-rose-500" : "bg-neutral-500";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      <span className="text-neutral-400 w-28 shrink-0">{label}</span>
      <span className={`flex-1 min-w-0 truncate ${valor ? "font-semibold" : "text-neutral-500"}`}>
        {valor ?? "Sin elegir"}
      </span>
      {estado === "acertado" && (
        <span className="text-[11px] font-bold text-emerald-400 tabular-nums shrink-0">+{pts}</span>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Mini-tabla
function MiniTabla({
  filas,
  total,
  puntos,
  actualId,
  miId,
}: {
  filas: FilaTabla[];
  total: number;
  puntos: Map<string, EspecialesPuntos>;
  actualId: string | null;
  miId: string | null;
}) {
  // Ranking por puntos de especiales (desc); desempate por posicion de tabla.
  const ranking = useMemo(() => {
    const posMap = new Map(filas.map((f) => [f.jugador_id, f.posicion] as const));
    return [...filas]
      .map((f) => ({ fila: f, pts: puntos.get(f.jugador_id)?.puntos_total ?? 0 }))
      .sort(
        (a, b) =>
          b.pts - a.pts ||
          (posMap.get(a.fila.jugador_id) ?? 0) - (posMap.get(b.fila.jugador_id) ?? 0)
      );
  }, [filas, puntos]);

  if (ranking.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <h2 className="mb-2 text-sm font-bold text-oro uppercase tracking-wide">
        Puntos especiales · todos
      </h2>
      <div className="overflow-hidden rounded-2xl border border-borde bg-carbon-card">
        <ul>
          {ranking.map(({ fila, pts }, i) => {
            const activo = fila.jugador_id === actualId;
            return (
              <li
                key={fila.jugador_id}
                className={`flex items-center gap-3 px-3 py-2 border-t border-borde/40 first:border-0 ${
                  activo ? "bg-oro/10" : ""
                }`}
              >
                <span className="w-5 shrink-0 text-center text-neutral-400 tabular-nums text-sm">
                  {i + 1}
                </span>
                <Avatar
                  src={avatarPorPosicion(fila, total)}
                  nombre={fila.nombre}
                  width={28}
                  variante={bordePorPosicion(fila.posicion, total)}
                />
                <span className={`flex-1 min-w-0 truncate text-sm ${activo ? "font-semibold text-white" : "text-neutral-200"}`}>
                  {fila.alias ?? fila.nombre}
                  {fila.jugador_id === miId ? " (tú)" : ""}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-oro">{pts}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
