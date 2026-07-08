// =====================================================================
// PronosticoView.tsx  ·  Pestana "Pronostico" (sandbox) dentro de Copa.
// =====================================================================
// Orquesta el cuadro interactivo de Cuartos en adelante: gestiona los picks
// (localStorage), muestra el PODIO elegido (campeon / subcampeon / 3er lugar),
// un boton para reiniciar y 3 cajitas de "mas elegido por todos" con barras.
// Paleta NEON (menta/azul/purpura) para diferenciarse de la fase real (oro).
// Lo unico que se sincroniza con Supabase es el PODIO del jugador (1 x jugador).
import { useEffect, useState } from "react";
import Flag from "../components/Flag";
import BracketPronostico from "../components/BracketPronostico";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  guardarSandboxPodio,
  obtenerSandboxPodio,
  type PodioSandbox,
  type VotoPodio,
  type PosicionPodio,
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
  type Podio,
  type EquipoResuelto,
} from "../lib/pronostico";

// Estilo de cada posicion del podio (neon). Clases completas -> Tailwind JIT.
const POSICIONES: {
  key: PosicionPodio;
  titulo: string;
  medalla: string;
  dot: string;
  barra: string;
  borde: string;
}[] = [
  { key: "campeon", titulo: "Campeon mas elegido", medalla: "\u{1F3C6}", dot: "bg-neon-menta", barra: "bg-neon-menta", borde: "border-neon-menta/30" },
  { key: "subcampeon", titulo: "Subcampeon mas elegido", medalla: "\u{1F948}", dot: "bg-neon-azul", barra: "bg-neon-azul", borde: "border-neon-azul/30" },
  { key: "tercero", titulo: "3er lugar mas elegido", medalla: "\u{1F949}", dot: "bg-neon-purpura", barra: "bg-neon-purpura", borde: "border-neon-purpura/30" },
];

export default function PronosticoView() {
  const { jugador } = useAuth();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const [picks, setPicks] = useState<Picks>(() => leerPicks());
  const [votos, setVotos] = useState<VotoPodio[]>([]);

  const slots = construirLlaves(partidos ?? []);
  const ix = indexarPorSlot(slots);
  const dep = construirDependientes(ix);
  const podio = podioActual(ix, picks);

  useEffect(() => {
    refrescarVotos();
  }, []);

  const refrescarVotos = async () => {
    try {
      setVotos(await obtenerSandboxPodio());
    } catch {
      /* sin conexion: las cajitas simplemente no se actualizan */
    }
  };

  // Sube (o resetea) el podio del jugador y refresca las barras.
  const sincronizarPodio = async (p: Podio) => {
    if (!jugador) return;
    const payload: PodioSandbox = {
      campeon: p.campeon?.nombre ?? null,
      campeonPais: p.campeon?.pais ?? null,
      subcampeon: p.subcampeon?.nombre ?? null,
      subcampeonPais: p.subcampeon?.pais ?? null,
      tercero: p.tercero?.nombre ?? null,
      terceroPais: p.tercero?.pais ?? null,
    };
    try {
      await guardarSandboxPodio(jugador.id, payload);
      refrescarVotos();
    } catch {
      /* no critico: el sandbox local sigue funcionando */
    }
  };

  const handlePick = (slotCode: string, lado: Lado) => {
    const nuevo = aplicarPick(picks, slotCode, lado, dep);
    setPicks(nuevo);
    guardarPicks(nuevo);
    sincronizarPodio(podioActual(ix, nuevo));
  };

  const handleReset = () => {
    limpiarPicks();
    setPicks({});
    sincronizarPodio({ campeon: null, subcampeon: null, tercero: null });
  };

  const hayPicks = Object.keys(picks).length > 0;

  return (
    <div className="pb-4">
      {/* Encabezado: podio actual del jugador + reiniciar */}
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
            Tu podio
          </div>
          {podio.campeon ? (
            <div className="flex flex-col gap-1">
              <PodioLinea medalla={"\u{1F3C6}"} color="text-neon-menta" equipo={podio.campeon} />
              <PodioLinea medalla={"\u{1F948}"} color="text-neon-azul" equipo={podio.subcampeon} />
              <PodioLinea medalla={"\u{1F949}"} color="text-neon-purpura" equipo={podio.tercero} />
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

      {/* 3 cajitas: podio mas elegido por todos */}
      <div className="mt-6 flex flex-col gap-4">
        {POSICIONES.map((pos) => (
          <CajaPosicion
            key={pos.key}
            estilo={pos}
            filas={votos.filter((v) => v.posicion === pos.key)}
          />
        ))}
      </div>
    </div>
  );
}

// Una linea del podio del jugador (medalla + bandera + nombre), con color neon.
function PodioLinea({
  medalla,
  color,
  equipo,
}: {
  medalla: string;
  color: string;
  equipo: EquipoResuelto | null;
}) {
  if (!equipo) {
    return (
      <div className="flex items-center gap-2 text-neutral-600">
        <span className="text-sm">{medalla}</span>
        <span className="text-xs">Por definir</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{medalla}</span>
      <Flag code={equipo.pais ?? "XX"} size={18} nombre={equipo.nombre} />
      <span className={`text-sm font-bold truncate ${color}`}>{equipo.nombre}</span>
    </div>
  );
}

// Cajita de una posicion del podio: ranking de paises con barras de %.
function CajaPosicion({
  estilo,
  filas,
}: {
  estilo: (typeof POSICIONES)[number];
  filas: VotoPodio[];
}) {
  const total = filas.reduce((acc, v) => acc + v.votos, 0);
  return (
    <div className={`mx-4 rounded-2xl border ${estilo.borde} bg-carbon-card p-4`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-100">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${estilo.dot}`} aria-hidden="true" />
        <span>{estilo.medalla} {estilo.titulo}</span>
        {total > 0 && <span className="text-neutral-500 font-semibold">({total})</span>}
      </h3>

      {total === 0 ? (
        <p className="text-xs text-neutral-500">Aun nadie eligio este puesto.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filas.map((v) => {
            const pct = Math.round((v.votos / total) * 100);
            return (
              <li key={v.pais}>
                <div className="mb-1 flex items-center gap-2">
                  <Flag code={v.iso ?? "XX"} size={18} nombre={v.pais} />
                  <span className="flex-1 truncate text-sm text-neutral-100">{v.pais}</span>
                  <span className="text-xs font-bold tabular-nums text-neutral-100">{pct}%</span>
                  <span className="w-6 text-right text-[11px] text-neutral-500 tabular-nums">
                    {v.votos}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-carbon-soft">
                  <div
                    className={`h-full rounded-full ${estilo.barra} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
