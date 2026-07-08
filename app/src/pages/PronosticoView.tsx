// =====================================================================
// PronosticoView.tsx  ·  Pestana "Pronostico" (sandbox) dentro de Copa.
// =====================================================================
// Orquesta el cuadro interactivo de Cuartos en adelante: gestiona los picks
// (localStorage), muestra el campeon elegido, un boton para reiniciar y la
// cajita de "pais mas elegido por todos" con barras de porcentaje.
// Lo unico que se sincroniza con Supabase es el CAMPEON del jugador.
import { useEffect, useState } from "react";
import Flag from "../components/Flag";
import BracketPronostico from "../components/BracketPronostico";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  guardarSandboxCampeon,
  obtenerSandboxCampeones,
  type VotoCampeon,
} from "../lib/data";
import { construirLlaves, indexarPorSlot } from "../lib/bracket";
import {
  aplicarPick,
  campeonActual,
  construirDependientes,
  guardarPicks,
  leerPicks,
  limpiarPicks,
  type Lado,
  type Picks,
} from "../lib/pronostico";

export default function PronosticoView() {
  const { jugador } = useAuth();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const [picks, setPicks] = useState<Picks>(() => leerPicks());
  const [votos, setVotos] = useState<VotoCampeon[]>([]);

  const slots = construirLlaves(partidos ?? []);
  const ix = indexarPorSlot(slots);
  const dep = construirDependientes(ix);
  const campeon = campeonActual(ix, picks);

  useEffect(() => {
    refrescarVotos();
  }, []);

  const refrescarVotos = async () => {
    try {
      setVotos(await obtenerSandboxCampeones());
    } catch {
      /* sin conexion: la cajita simplemente no se actualiza */
    }
  };

  // Sube (o resetea) el campeon del jugador y refresca las barras.
  const sincronizarCampeon = async (nombre: string | null, pais: string | null) => {
    if (!jugador) return;
    try {
      await guardarSandboxCampeon(jugador.id, nombre, pais);
      refrescarVotos();
    } catch {
      /* no critico: el sandbox local sigue funcionando */
    }
  };

  const handlePick = (slotCode: string, lado: Lado) => {
    const nuevo = aplicarPick(picks, slotCode, lado, dep);
    setPicks(nuevo);
    guardarPicks(nuevo);
    const camp = campeonActual(ix, nuevo);
    sincronizarCampeon(camp?.nombre ?? null, camp?.pais ?? null);
  };

  const handleReset = () => {
    limpiarPicks();
    setPicks({});
    sincronizarCampeon(null, null);
  };

  const hayPicks = Object.keys(picks).length > 0;

  return (
    <div className="pb-4">
      {/* Encabezado: campeon actual + reiniciar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">
            Tu campeon
          </div>
          {campeon ? (
            <div className="flex items-center gap-2">
              <Flag code={campeon.pais ?? "XX"} size={22} nombre={campeon.nombre} />
              <span className="font-bold text-oro truncate">{campeon.nombre}</span>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">Elige los ganadores…</div>
          )}
        </div>
        {hayPicks && (
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-full border border-borde bg-carbon-card px-3 py-1.5 text-xs font-semibold text-neutral-300 active:bg-carbon-soft"
          >
            Reiniciar
          </button>
        )}
      </div>

      <p className="px-4 pb-1 text-xs text-neutral-500">
        Juego libre: no suma puntos ni cambia la tabla. Toca un equipo para
        elegir quien avanza.
      </p>

      {cargando && (
        <p className="px-4 py-6 text-neutral-400 text-sm">Cargando cuadro…</p>
      )}
      {error && (
        <p className="px-4 py-6 text-red-400 text-sm">
          No se pudo cargar el cuadro. Revisa la conexion.
        </p>
      )}

      {!cargando && !error && (
        <BracketPronostico slots={slots} picks={picks} onPick={handlePick} />
      )}

      {/* Cajita: pais mas elegido como campeon por todos */}
      <CajaCampeones votos={votos} />
    </div>
  );
}

// --------------------------------------------- Cajita de % por pais campeon
function CajaCampeones({ votos }: { votos: VotoCampeon[] }) {
  const total = votos.reduce((acc, v) => acc + v.votos, 0);
  if (total === 0) {
    return (
      <div className="mx-4 mt-6 rounded-2xl border border-borde bg-carbon-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-oro">
          Campeon mas elegido
        </h3>
        <p className="mt-2 text-xs text-neutral-500">
          Aun nadie corono un campeon. ¡Se el primero!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-6 rounded-2xl border border-borde bg-carbon-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-oro">
        Campeon mas elegido ({total})
      </h3>
      <ul className="flex flex-col gap-2.5">
        {votos.map((v) => {
          const pct = Math.round((v.votos / total) * 100);
          return (
            <li key={v.campeon}>
              <div className="mb-1 flex items-center gap-2">
                <Flag code={v.pais ?? "XX"} size={18} nombre={v.campeon} />
                <span className="flex-1 truncate text-sm">{v.campeon}</span>
                <span className="text-xs font-bold tabular-nums text-oro">{pct}%</span>
                <span className="w-6 text-right text-[11px] text-neutral-500 tabular-nums">
                  {v.votos}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-carbon-soft">
                <div
                  className="h-full rounded-full bg-oro transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
