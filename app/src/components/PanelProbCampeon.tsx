// Panel "Probabilidad de campeon de la quiniela" (Estadisticas).
// Corre una simulacion Monte Carlo (lib/probCampeon) sobre lo que falta del
// Mundial: el bracket (para puntos pais) + el sorteo de los 5 premios
// individuales con probabilidades de MERCADO. Muestra el % de cada participante
// de terminar 1o, y debajo el favorito de cada premio.
import { useMemo } from "react";
import { useAsync } from "../lib/useAsync";
import {
  obtenerTabla,
  obtenerDesgloseTormenta,
  puntosEspeciales,
  todasEspeciales,
} from "../lib/data";
import {
  simularQuiniela,
  FUERZA_EQUIPOS,
  type ParticipanteSim,
} from "../lib/probCampeon";

// Semifinales cableadas aca (matchean con FUERZA_EQUIPOS en probCampeon.ts).
// Si cambian los cruces, se ajustan ambos archivos.
const SEMIS = { a: "Francia", b: "España", c: "Inglaterra", d: "Argentina" };

// Carga lo que necesita el motor en paralelo y arma los participantes.
async function reunirDatos(): Promise<ParticipanteSim[]> {
  const [tabla, desglose, pEsp, todasEsp] = await Promise.all([
    obtenerTabla(),
    obtenerDesgloseTormenta(),
    puntosEspeciales(),
    todasEspeciales(),
  ]);

  const sinPronPorId = new Map<string, number>();
  for (const d of desglose) sinPronPorId.set(d.jugador_id, d.no_pronosticados);

  const picksPorId = new Map<string, (typeof todasEsp)[number]>();
  for (const e of todasEsp) picksPorId.set(e.jugador_id, e);

  return tabla.map((f) => {
    const pe = pEsp.get(f.jugador_id);
    // base_estable = puntos - TODOS los especiales variables (pais + 5 premios).
    // Deja solo partidos + ajuste; el sim re-suma pais y premios simulados.
    const especialesActuales =
      (pe?.puntos_pais ?? 0) +
      (pe?.puntos_goleador ?? 0) +
      (pe?.puntos_asistidor ?? 0) +
      (pe?.puntos_mejor_jugador ?? 0) +
      (pe?.puntos_mejor_arquero ?? 0) +
      (pe?.puntos_mejor_joven ?? 0);
    const picks = picksPorId.get(f.jugador_id);
    return {
      id: f.jugador_id,
      nombre: f.alias ?? f.nombre,
      baseEstable: f.puntos - especialesActuales,
      exactos: f.exactos,
      aciertos: f.aciertos,
      fallas: f.fallas,
      sinPron: sinPronPorId.get(f.jugador_id) ?? 0,
      picksPais: [
        picks?.campeon ?? null,
        picks?.finalista_1 ?? null,
        picks?.finalista_2 ?? null,
        picks?.semifinalista_1 ?? null,
        picks?.semifinalista_2 ?? null,
        picks?.semifinalista_3 ?? null,
        picks?.semifinalista_4 ?? null,
      ],
      picksPremio: {
        goleador: picks?.goleador ?? null,
        asistidor: picks?.asistidor ?? null,
        mejor_jugador: picks?.mejor_jugador ?? null,
        mejor_arquero: picks?.mejor_arquero ?? null,
        mejor_joven: picks?.mejor_joven ?? null,
      },
    };
  });
}

export default function PanelProbCampeon() {
  const { data, cargando, error } = useAsync(reunirDatos, []);

  const sim = useMemo(() => {
    if (!data) return null;
    return simularQuiniela({ participantes: data, semis: SEMIS, iteraciones: 10000 });
  }, [data]);

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
          Monte Carlo ({sim.iteraciones.toLocaleString()} escenarios): bracket ponderado por fuerza
          ({FUERZA_EQUIPOS.map((f) => `${f.alias[0]} ${f.fuerza}%`).join(" · ")}) + premios por cuota de mercado.
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
