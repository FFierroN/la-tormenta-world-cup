// Cajita compacta con la probabilidad de UN participante de salir campeon de la
// quiniela. Va arriba en el detalle del participante (pantalla que se abre al
// tocar a alguien en la tabla). Reusa el hook useProbCampeon (misma simulacion
// que el panel completo bajo la tabla Clasica).
import { useProbCampeon } from "../lib/useProbCampeon";

export default function CajaProbCampeon({ jugadorId }: { jugadorId: string | null }) {
  const { probPorId, cargando, error } = useProbCampeon();
  if (!jugadorId || error) return null;

  const prob = probPorId.get(jugadorId);
  const pct = prob != null ? (prob * 100).toFixed(1) : null;

  return (
    <div className="mx-4 mb-3 flex items-center justify-between gap-3 bg-carbon-card border border-emerald-500/40 rounded-xl px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">
          Probabilidad de ser campeon
        </div>
        <div className="text-[10px] text-neutral-500 leading-tight">
          de la quiniela (simulacion Monte Carlo)
        </div>
      </div>
      <div className="text-2xl font-black tabular-nums text-emerald-400 shrink-0">
        {cargando || pct == null ? "…" : `${pct}%`}
      </div>
    </div>
  );
}
