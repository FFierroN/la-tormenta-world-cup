// Lista de participantes para la pestana "Predicciones > Especiales" (dentro de
// Tabla) y la ruta /especiales-todos. Cada fila = posicion + avatar + alias +
// bandera del CAMPEON elegido. Al tocar una fila se abre el detalle completo de
// ese jugador (/especiales/:jugadorId) con sus especiales y puntajes.
//
// Guardrail anti-copia: si la ventana de edicion sigue ABIERTA, solo se ve tu
// propia fila (para no copiarle a nadie). Al cerrarla, se revelan las de todos.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import Flag from "./Flag";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { codigoPais, mapaEquipoPais } from "../lib/banderas";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  obtenerTabla,
  prediccionesHabilitadas,
  todasEspeciales,
} from "../lib/data";
import type { EspecialesConJugador } from "../lib/types";

export default function PrediccionesTodos() {
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const { data: filas, cargando: cargF, error: errF } = useAsync(obtenerTabla, []);
  const { data: especiales } = useAsync(todasEspeciales, []);
  const { data: partidos } = useAsync(listarPartidos, []);
  const { data: ventanaAbierta } = useAsync(prediccionesHabilitadas, []);

  // Mapa nombre-equipo -> ISO para las banderas (se arma una vez).
  const mapa = useMemo(() => mapaEquipoPais(partidos ?? []), [partidos]);

  // Campeon elegido por jugador_id.
  const campeonPorJugador = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const e of (especiales ?? []) as EspecialesConJugador[]) {
      m.set(e.jugador_id, e.campeon ?? null);
    }
    return m;
  }, [especiales]);

  const filasOrdenadas = filas ?? [];
  const total = filasOrdenadas.length;
  const oculto = ventanaAbierta === true; // mientras este abierta, ocultar ajenas

  const visibles = oculto
    ? filasOrdenadas.filter((f) => jugador && f.jugador_id === String(jugador.id))
    : filasOrdenadas;

  return (
    <>
      {cargF && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}
      {errF && (
        <p className="px-4 text-red-400 text-sm">
          No se pudo cargar. Revisa la conexión con Supabase.
        </p>
      )}

      {oculto && (
        <div className="mx-4 mb-4 rounded-xl border border-borde bg-carbon-card p-3 text-sm text-neutral-300">
          Las predicciones de los demás se revelan cuando cierre la ventana de
          edición. Por ahora solo ves las tuyas.
        </div>
      )}

      <ul className="px-4 pb-10 flex flex-col gap-2.5">
        {visibles.map((f) => {
          const esYo = !!jugador && f.jugador_id === String(jugador.id);
          const campeon = campeonPorJugador.get(f.jugador_id) ?? null;
          return (
            <li key={f.jugador_id}>
              <button
                onClick={() => navigate(`/especiales/${f.jugador_id}`)}
                aria-label={`Ver especiales de ${f.alias ?? f.nombre}`}
                className={`w-full flex items-center gap-3 rounded-2xl border bg-carbon-card px-3 py-3 text-left active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oro ${
                  esYo ? "border-oro/60" : "border-borde"
                }`}
              >
                <span className="w-6 shrink-0 text-center font-bold text-oro tabular-nums">
                  {f.posicion}
                </span>
                <Avatar
                  src={avatarPorPosicion(f, total)}
                  nombre={f.nombre}
                  width={44}
                  variante={bordePorPosicion(f.posicion, total)}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold leading-tight truncate">
                    {f.alias ?? f.nombre}
                    {esYo && (
                      <span className="ml-1.5 text-[10px] font-bold text-oro">(tú)</span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                    Campeón:
                    {campeon ? (
                      <>
                        <span className="inline-flex rounded ring-1 ring-oro">
                          <Flag code={codigoPais(mapa, campeon)} nombre={campeon} size={22} rect />
                        </span>
                        <span className="text-neutral-200 truncate">{campeon}</span>
                      </>
                    ) : (
                      <span className="text-neutral-500">sin elegir</span>
                    )}
                  </span>
                </span>
                <Chevron />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Chevron() {
  return (
    <svg
      className="w-5 h-5 shrink-0 text-neutral-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
