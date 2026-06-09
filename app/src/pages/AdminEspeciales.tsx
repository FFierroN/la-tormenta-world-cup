import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  equiposReales,
  guardarResultadoReal,
  leerResultadosReales,
  recalcularEspeciales,
  type ClaveReal,
} from "../lib/data";

const SELECTS: { clave: ClaveReal; label: string }[] = [
  { clave: "real_campeon", label: "Campeon" },
  { clave: "real_finalista_1", label: "Finalista 1" },
  { clave: "real_finalista_2", label: "Finalista 2" },
  { clave: "real_semi_1", label: "Semifinalista 1" },
  { clave: "real_semi_2", label: "Semifinalista 2" },
  { clave: "real_semi_3", label: "Semifinalista 3" },
  { clave: "real_semi_4", label: "Semifinalista 4" },
];
const TEXTOS: { clave: ClaveReal; label: string }[] = [
  { clave: "real_goleador", label: "Goleador" },
  { clave: "real_mejor_jugador", label: "Mejor jugador" },
  { clave: "real_mejor_arquero", label: "Mejor arquero" },
  { clave: "real_mejor_joven", label: "Mejor joven" },
];

export default function AdminEspeciales() {
  const navigate = useNavigate();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [equipos, setEquipos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [reales, eqs] = await Promise.all([
          leerResultadosReales(),
          equiposReales(),
        ]);
        setVals(reales);
        setEquipos(eqs);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const set = (clave: string, valor: string) =>
    setVals((v) => ({ ...v, [clave]: valor }));

  const guardarYRecalcular = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await Promise.all(
        [...SELECTS, ...TEXTOS].map((f) =>
          guardarResultadoReal(f.clave, vals[f.clave] ?? "")
        )
      );
      await recalcularEspeciales();
      setMsg("Resultados guardados y puntos recalculados.");
    } catch {
      setMsg("No se pudo completar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-neutral-400">Cargando...</div>;
  }

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Resultados especiales</h1>
      </header>

      <p className="px-4 text-xs text-neutral-400 mb-3">
        Carga esto al final del Mundial. Al guardar, se recalculan los puntos
        especiales de todos.
      </p>

      <div className="px-4 flex flex-col gap-3">
        {SELECTS.map((f) => (
          <label key={f.clave} className="block">
            <span className="block text-xs text-neutral-400 mb-1">{f.label}</span>
            <select
              value={vals[f.clave] ?? ""}
              onChange={(e) => set(f.clave, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
            >
              <option value="">Sin definir</option>
              {vals[f.clave] && !equipos.includes(vals[f.clave]) && (
                <option value={vals[f.clave]}>{vals[f.clave]}</option>
              )}
              {equipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ))}

        {TEXTOS.map((f) => (
          <label key={f.clave} className="block">
            <span className="block text-xs text-neutral-400 mb-1">{f.label}</span>
            <input
              value={vals[f.clave] ?? ""}
              onChange={(e) => set(f.clave, e.target.value)}
              placeholder="Nombre"
              className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
            />
          </label>
        ))}

        <button
          onClick={guardarYRecalcular}
          disabled={guardando}
          className="mt-2 w-full py-3 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
        >
          {guardando ? "Procesando..." : "Guardar y recalcular puntos"}
        </button>
        {msg && <p className="text-center text-xs text-neutral-300">{msg}</p>}
      </div>
    </div>
  );
}
