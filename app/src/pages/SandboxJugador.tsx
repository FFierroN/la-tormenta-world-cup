// =====================================================================
// SandboxJugador.tsx  ·  Pantalla del cuadro "que pasaria si" de UN jugador.
// =====================================================================
// Ruta /sandbox/:jugadorId. Si es el jugador logueado -> EDITABLE (picks en
// localStorage + sync a Supabase). Si es otro -> SOLO LECTURA (picks traidos
// de Supabase). Muestra el podio del jugador arriba y el bracket abajo.
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BracketPronostico from "../components/BracketPronostico";
import { PodioLinea } from "../components/podioSandbox";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  guardarSandbox,
  sandboxDeJugador,
  type PodioSandbox,
} from "../lib/data";
import { construirLlaves, indexarPorSlot } from "../lib/bracket";
import {
  aplicarPick,
  podioActual,
  construirDependientes,
  guardarPicks,
  leerPicks,
  limpiarPicks,
  type Lado,
  type Picks,
} from "../lib/pronostico";

export default function SandboxJugador() {
  const { jugadorId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { jugador } = useAuth();

  const esPropio = !!jugador && String(jugador.id) === jugadorId;
  const nombre = (location.state as { nombre?: string } | null)?.nombre ?? null;

  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const [picks, setPicks] = useState<Picks>(() => (esPropio ? leerPicks() : {}));
  const [listo, setListo] = useState(esPropio);

  const slots = construirLlaves(partidos ?? []);
  const ix = indexarPorSlot(slots);
  const dep = construirDependientes(ix);
  const podio = podioActual(ix, picks);

  // Cargar picks: propios de localStorage (fallback Supabase si vacio); de
  // otros, siempre de Supabase (solo lectura).
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (esPropio) {
        if (Object.keys(leerPicks()).length > 0) return; // ya estan
        try {
          const remoto = await sandboxDeJugador(jugadorId);
          if (vivo && remoto && Object.keys(remoto).length > 0) {
            setPicks(remoto as Picks);
            guardarPicks(remoto as Picks);
          }
        } catch {
          /* sin conexion: arranca vacio */
        }
      } else {
        try {
          const remoto = await sandboxDeJugador(jugadorId);
          if (vivo) setPicks((remoto ?? {}) as Picks);
        } catch {
          /* sin conexion */
        } finally {
          if (vivo) setListo(true);
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [jugadorId, esPropio]);

  // Sube el sandbox del jugador (bracket + podio). Solo el propio.
  const sincronizar = async (nuevo: Picks) => {
    if (!esPropio || !jugador) return;
    const p = podioActual(ix, nuevo);
    const payload: PodioSandbox = {
      campeon: p.campeon?.nombre ?? null,
      campeonPais: p.campeon?.pais ?? null,
      subcampeon: p.subcampeon?.nombre ?? null,
      subcampeonPais: p.subcampeon?.pais ?? null,
      tercero: p.tercero?.nombre ?? null,
      terceroPais: p.tercero?.pais ?? null,
    };
    try {
      await guardarSandbox(jugador.id, payload, nuevo);
    } catch {
      /* no critico: el sandbox local sigue */
    }
  };

  const handlePick = (slotCode: string, lado: Lado) => {
    const nuevo = aplicarPick(picks, slotCode, lado, dep);
    setPicks(nuevo);
    guardarPicks(nuevo);
    sincronizar(nuevo);
  };

  const handleReset = () => {
    limpiarPicks();
    setPicks({});
    sincronizar({});
  };

  const hayPicks = Object.keys(picks).length > 0;
  const titulo = esPropio ? "Tu podio" : nombre ? `Podio de ${nombre}` : "Podio";

  return (
    <div className="max-w-md mx-auto pb-4">
      <header className="flex items-center gap-2 px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="text-oro"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold truncate">
          {esPropio ? "Mi pronostico de llaves" : nombre ?? "Pronostico de llaves"}
        </h1>
      </header>

      {/* Podio del jugador + reiniciar (solo el propio) */}
      <div className="flex items-start justify-between gap-2 px-4 pb-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
            {titulo}
          </div>
          {podio.campeon ? (
            <div className="flex flex-col gap-1">
              <PodioLinea medalla={"\u{1F3C6}"} color="text-neon-menta" equipo={podio.campeon} />
              <PodioLinea medalla={"\u{1F948}"} color="text-neon-azul" equipo={podio.subcampeon} />
              <PodioLinea medalla={"\u{1F949}"} color="text-neon-purpura" equipo={podio.tercero} />
            </div>
          ) : (
            <div className="text-sm text-neutral-400">
              {esPropio ? "Elige los ganadores…" : "Sin pronostico."}
            </div>
          )}
        </div>
        {esPropio && hayPicks && (
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-full border border-borde bg-carbon-card px-3 py-1.5 text-xs font-semibold text-neutral-300 active:bg-carbon-soft"
          >
            Reiniciar
          </button>
        )}
      </div>

      {(cargando || !listo) && (
        <p className="px-4 py-6 text-neutral-400 text-sm">Cargando cuadro…</p>
      )}
      {error && (
        <p className="px-4 py-6 text-red-400 text-sm">
          No se pudo cargar el cuadro. Revisa la conexion.
        </p>
      )}

      {!cargando && listo && !error && (
        <BracketPronostico
          slots={slots}
          picks={picks}
          onPick={esPropio ? handlePick : undefined}
        />
      )}
    </div>
  );
}
