// Panel de admin: editar las FUERZAS de equipo y las CUOTAS de premios que usa
// la simulacion "Probabilidad de campeon de la quiniela". Se guardan en la BD
// (configuracion.prob_campeon_config) -> el admin las reescribe cuando termina
// un partido, SIN re-deploy. Si nunca se guardo nada, parte del default cableado.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAsync } from "../lib/useAsync";
import { leerProbConfig, guardarProbConfig } from "../lib/data";
import {
  configPorDefecto,
  FUERZA_EQUIPOS,
  PREMIOS,
  norm,
  type ProbConfig,
} from "../lib/probCampeon";

// Combina el default con lo guardado (para que nunca falte un campo).
function mergear(guardado: ProbConfig | null): ProbConfig {
  const base = configPorDefecto();
  if (!guardado) return base;
  const fuerzas = { ...base.fuerzas, ...(guardado.fuerzas ?? {}) };
  const cuotas: ProbConfig["cuotas"] = {};
  for (const k of Object.keys(base.cuotas)) {
    cuotas[k] = { ...base.cuotas[k], ...(guardado.cuotas?.[k] ?? {}) };
  }
  return { fuerzas, cuotas };
}

export default function AdminProbabilidades() {
  const navigate = useNavigate();
  const { data: guardado, cargando } = useAsync(leerProbConfig, []);
  const inicial = useMemo(() => mergear(guardado ?? null), [guardado]);
  const [cfg, setCfg] = useState<ProbConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Sincroniza el estado editable cuando llega el config inicial.
  const c = cfg ?? inicial;

  const setFuerza = (keyNorm: string, v: number) =>
    setCfg({ ...c, fuerzas: { ...c.fuerzas, [keyNorm]: v } });

  const setCuota = (premio: string, candNorm: string, v: number) =>
    setCfg({
      ...c,
      cuotas: { ...c.cuotas, [premio]: { ...c.cuotas[premio], [candNorm]: v } },
    });

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await guardarProbConfig(c);
      setMsg("Guardado. La probabilidad se recalcula con estos valores.");
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = () => {
    setCfg(configPorDefecto());
    setMsg("Valores por defecto cargados (recuerda Guardar).");
  };

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Probabilidad de campeon</h1>
      </header>

      <p className="px-4 text-xs text-neutral-400 mb-4">
        Ajusta la fuerza de cada equipo y la cuota (%) de cada premio. Se usan en la
        simulacion Monte Carlo. Reescribelas cuando termine un partido.
      </p>

      {cargando && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}

      {/* FUERZAS de equipo */}
      <section className="px-4 mb-5">
        <h2 className="text-sm font-bold text-oro mb-2">Fuerza de equipos (peso relativo)</h2>
        <div className="flex flex-col gap-2">
          {FUERZA_EQUIPOS.map((e) => {
            const k = norm(e.nombre);
            return (
              <label key={k} className="flex items-center justify-between gap-3 bg-carbon-card border border-borde rounded-xl px-3 py-2">
                <span className="text-sm">{e.nombre}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={c.fuerzas[k] ?? 0}
                  onChange={(ev) => setFuerza(k, Number(ev.target.value))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-carbon-soft border border-borde text-sm text-center"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* CUOTAS de premios */}
      {PREMIOS.map((pr) => (
        <section key={pr.key} className="px-4 mb-5">
          <h2 className="text-sm font-bold text-oro mb-2">{pr.label} — cuota %</h2>
          <div className="flex flex-col gap-2">
            {pr.candidatos.map((cand) => {
              const k = norm(cand.nombre);
              return (
                <label key={k} className="flex items-center justify-between gap-3 bg-carbon-card border border-borde rounded-xl px-3 py-2">
                  <span className="text-sm min-w-0 truncate">{cand.nombre}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={c.cuotas[pr.key]?.[k] ?? 0}
                    onChange={(ev) => setCuota(pr.key, k, Number(ev.target.value))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-carbon-soft border border-borde text-sm text-center"
                  />
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {msg && <p className="px-4 text-sm text-emerald-400 mb-3">{msg}</p>}

      <div className="px-4 flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-oro text-carbon rounded-xl py-2.5 text-sm font-bold active:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={restaurar}
          className="px-4 bg-carbon-card border border-borde rounded-xl py-2.5 text-sm font-semibold active:bg-carbon-soft"
        >
          Restaurar
        </button>
      </div>
    </div>
  );
}
