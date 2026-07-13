// Panel "Probabilidad de campeon de la quiniela".
// Vive DEBAJO de la tabla en la pestana Clasica (menu Tabla). Muestra el % de
// cada participante de terminar 1o + los favoritos de cada premio individual.
// La simulacion (Monte Carlo) vive en el hook useProbCampeon (compartido con
// la cajita de % del detalle de cada participante).
import { useProbCampeon, SEMIS } from "../lib/useProbCampeon";
import { FUERZA_EQUIPOS } from "../lib/probCampeon";

export default function PanelProbCampeon() {
  const { sim, cargando, error } = useProbCampeon();

  if (cargando) {
    return <Contenedor><p className="text-neutral-400 text-sm">Simulando escenarios...</p></Contenedor>;
  }
  if (error) {
    return <Contenedor><p className="text-red-400 text-sm">No se pudo simular: {error}</p></Contenedor>;
  }
  if (!sim) return null;

  const max = Math.max(...sim.quiniela.map((f) => f.prob), 0.001);

  return (
    <Contenedor>
      <div className="mb-2">
        <h3 className="text-sm font-bold text-oro">Probabilidad de campeon de la quiniela</h3>
        <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">
          Monte Carlo ({sim.iteraciones.toLocaleString()} escenarios): bracket ({SEMIS.a} vs {SEMIS.b} · {SEMIS.c} vs {SEMIS.d})
          ponderado por fuerza ({FUERZA_EQUIPOS.map((f) => `${f.alias[0]} ${f.fuerza}%`).join(" · ")}) + premios por cuota de mercado.
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {sim.quiniela.map((f, i) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-right tabular-nums text-neutral-500 text-[11px]">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate">{f.nombre}</span>
            <div className="w-24 h-2 bg-carbon-soft rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(f.prob / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right tabular-nums font-bold text-emerald-400">
              {(f.prob * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>

      {/* Favoritos de cada premio (probabilidad de mercado usada en el sim) */}
      <div className="mt-4 pt-3 border-t border-borde">
        <h4 className="text-xs font-bold text-oro mb-2">Premios individuales (cuota de mercado)</h4>
        <div className="flex flex-col gap-2.5">
          {sim.premios.map((pr) => (
            <div key={pr.key}>
              <div className="text-[11px] text-neutral-400 mb-0.5">{pr.label}</div>
              <ul className="flex flex-col gap-0.5">
                {pr.filas.slice(0, 3).map((f) => (
                  <li key={f.nombre} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 min-w-0 truncate">{f.nombre}</span>
                    <div className="w-16 h-1.5 bg-carbon-soft rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${f.prob * 100}%` }} />
                    </div>
                    <span className="w-9 text-right tabular-nums text-amber-400 font-semibold">
                      {(f.prob * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-neutral-500 mt-2 leading-tight">
          Probabilidades de casas de apuestas (fase semifinal). Cada premio suma sus puntos a quien
          lo haya acertado en sus especiales: goleador +15, resto +10.
        </p>
      </div>
    </Contenedor>
  );
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return <div className="bg-carbon-card border border-borde rounded-xl p-3">{children}</div>;
}
