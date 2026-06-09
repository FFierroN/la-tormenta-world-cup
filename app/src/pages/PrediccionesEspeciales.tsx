import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  equiposReales,
  guardarEspeciales,
  misEspeciales,
  prediccionesHabilitadas,
} from "../lib/data";
import type { Especiales } from "../lib/types";

const VACIO: Especiales = {
  campeon: null,
  finalista_1: null,
  finalista_2: null,
  semifinalista_1: null,
  semifinalista_2: null,
  semifinalista_3: null,
  semifinalista_4: null,
  goleador: null,
  mejor_jugador: null,
  mejor_arquero: null,
  mejor_joven: null,
};

export default function PrediccionesEspeciales() {
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const [datos, setDatos] = useState<Especiales>(VACIO);
  const [equipos, setEquipos] = useState<string[]>([]);
  const [habilitado, setHabilitado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!jugador) return;
      try {
        const [habil, eqs, mis] = await Promise.all([
          prediccionesHabilitadas(),
          equiposReales(),
          misEspeciales(jugador.id),
        ]);
        setHabilitado(habil);
        setEquipos(eqs);
        if (mis) setDatos({ ...VACIO, ...mis });
      } finally {
        setCargando(false);
      }
    })();
  }, [jugador]);

  const set = (campo: keyof Especiales, valor: string) =>
    setDatos((d) => ({ ...d, [campo]: valor || null }));

  const guardar = async () => {
    if (!jugador) return;
    setGuardando(true);
    setMsg(null);
    try {
      const r = await guardarEspeciales(jugador.id, datos);
      setMsg(r === "ok" ? "Guardado." : "La ventana esta cerrada.");
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-neutral-400">Cargando...</div>;
  }

  const ro = !habilitado; // solo lectura si la ventana esta cerrada

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/cuenta")} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Predicciones especiales</h1>
      </header>

      {ro && (
        <div className="mx-4 mb-4 bg-carbon-card border border-borde rounded-xl p-3 text-sm text-neutral-300">
          La ventana de edicion esta cerrada. Esto es lo que dejaste guardado.
        </div>
      )}

      <div className="px-4 flex flex-col gap-5">
        <Seccion titulo="Campeon y finalistas">
          <SelectEquipo label="Campeon" valor={datos.campeon} equipos={equipos} ro={ro} onChange={(v) => set("campeon", v)} />
          <SelectEquipo label="Finalista 1" valor={datos.finalista_1} equipos={equipos} ro={ro} onChange={(v) => set("finalista_1", v)} />
          <SelectEquipo label="Finalista 2" valor={datos.finalista_2} equipos={equipos} ro={ro} onChange={(v) => set("finalista_2", v)} />
        </Seccion>

        <Seccion titulo="Semifinalistas">
          <SelectEquipo label="Semifinalista 1" valor={datos.semifinalista_1} equipos={equipos} ro={ro} onChange={(v) => set("semifinalista_1", v)} />
          <SelectEquipo label="Semifinalista 2" valor={datos.semifinalista_2} equipos={equipos} ro={ro} onChange={(v) => set("semifinalista_2", v)} />
          <SelectEquipo label="Semifinalista 3" valor={datos.semifinalista_3} equipos={equipos} ro={ro} onChange={(v) => set("semifinalista_3", v)} />
          <SelectEquipo label="Semifinalista 4" valor={datos.semifinalista_4} equipos={equipos} ro={ro} onChange={(v) => set("semifinalista_4", v)} />
        </Seccion>

        <Seccion titulo="Premios individuales">
          <TextoCampo label="Goleador" valor={datos.goleador} ro={ro} onChange={(v) => set("goleador", v)} />
          <TextoCampo label="Mejor jugador" valor={datos.mejor_jugador} ro={ro} onChange={(v) => set("mejor_jugador", v)} />
          <TextoCampo label="Mejor arquero" valor={datos.mejor_arquero} ro={ro} onChange={(v) => set("mejor_arquero", v)} />
          <TextoCampo label="Mejor joven" valor={datos.mejor_joven} ro={ro} onChange={(v) => set("mejor_joven", v)} />
        </Seccion>

        {!ro && (
          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full py-3 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar predicciones"}
          </button>
        )}
        {msg && <p className="text-center text-xs text-neutral-300">{msg}</p>}
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-carbon-card border border-borde rounded-2xl p-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}

function SelectEquipo({
  label,
  valor,
  equipos,
  ro,
  onChange,
}: {
  label: string;
  valor: string | null;
  equipos: string[];
  ro: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-400 mb-1">{label}</span>
      <select
        value={valor ?? ""}
        disabled={ro}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm disabled:opacity-70"
      >
        <option value="">Sin elegir</option>
        {/* Si el valor guardado ya no esta en la lista, lo mostramos igual */}
        {valor && !equipos.includes(valor) && <option value={valor}>{valor}</option>}
        {equipos.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextoCampo({
  label,
  valor,
  ro,
  onChange,
}: {
  label: string;
  valor: string | null;
  ro: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-400 mb-1">{label}</span>
      <input
        value={valor ?? ""}
        disabled={ro}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nombre"
        className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm disabled:opacity-70"
      />
    </label>
  );
}
