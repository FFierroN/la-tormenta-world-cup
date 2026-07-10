import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  guardarResultadoReal,
  leerResultadosReales,
  type ClaveReal,
} from "../lib/data";

// Ya NO se cargan a mano campeon/finalistas/semis/3er (salen de las llaves) ni
// goleador/asistidor (salen de los eventos). Solo quedan las 3 distinciones
// SUBJETIVAS de FIFA, que no se pueden derivar de los datos de partidos.
const TEXTOS: { clave: ClaveReal; label: string }[] = [
  { clave: "real_mejor_jugador", label: "Mejor jugador (Balón de Oro)" },
  { clave: "real_mejor_arquero", label: "Mejor arquero (Guante de Oro)" },
  { clave: "real_mejor_joven", label: "Mejor joven" },
];

export default function AdminEspeciales() {
  const navigate = useNavigate();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setVals(await leerResultadosReales());
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const set = (clave: string, valor: string) =>
    setVals((v) => ({ ...v, [clave]: valor }));

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await Promise.all(
        TEXTOS.map((f) => guardarResultadoReal(f.clave, vals[f.clave] ?? ""))
      );
      setMsg("Guardado. Los puntos se actualizan solos.");
    } catch {
      setMsg("No se pudo guardar.");
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
        <h1 className="text-lg font-bold">Distinciones FIFA</h1>
      </header>

      <div className="mx-4 mb-4 rounded-xl border border-borde bg-carbon-card p-3 text-xs text-neutral-300">
        El <b>campeón, finalistas, semifinalistas y 3er lugar</b> se calculan
        solos desde las llaves. El <b>goleador y asistidor</b> salen de los
        eventos de los partidos. Solo carga aquí las 3 distinciones que anuncia
        FIFA al final (voto). Los puntos se actualizan automáticamente.
      </div>

      <div className="px-4 flex flex-col gap-3">
        {TEXTOS.map((f) => (
          <label key={f.clave} className="block">
            <span className="block text-xs text-neutral-400 mb-1">{f.label}</span>
            <input
              value={vals[f.clave] ?? ""}
              onChange={(e) => set(f.clave, e.target.value)}
              placeholder="Nombre del jugador"
              className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
            />
          </label>
        ))}

        <button
          onClick={guardar}
          disabled={guardando}
          className="mt-2 w-full py-3 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar distinciones"}
        </button>
        {msg && <p className="text-center text-xs text-neutral-300">{msg}</p>}
      </div>
    </div>
  );
}
