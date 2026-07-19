import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarJugadoresAdmin,
  listarPuntosEspeciales,
  setPuntosEspeciales,
  PUNTOS_ESPECIALES_CERO,
} from "../lib/data";
import { useAsync } from "../lib/useAsync";
import type { JugadorAdmin, PuntosEspeciales } from "../lib/types";

// Las 9 categorias especiales, con su valor SUGERIDO (solo como pista; el admin
// escribe el numero que quiera). Fuente unica -> se recorre en el formulario.
type ClaveEsp = keyof PuntosEspeciales;
const CATEGORIAS: {
  grupo: "Pais" | "Distincion";
  clave: ClaveEsp;
  label: string;
  sugerido: number;
}[] = [
  { grupo: "Pais", clave: "campeon", label: "Campeon", sugerido: 30 },
  { grupo: "Pais", clave: "finalista", label: "Finalista", sugerido: 12 },
  { grupo: "Pais", clave: "tercer", label: "Tercer lugar", sugerido: 8 },
  { grupo: "Pais", clave: "semi", label: "Semifinalista", sugerido: 6 },
  { grupo: "Distincion", clave: "goleador", label: "Goleador", sugerido: 15 },
  { grupo: "Distincion", clave: "asistidor", label: "Asistidor", sugerido: 10 },
  { grupo: "Distincion", clave: "mejor_jugador", label: "Mejor jugador", sugerido: 10 },
  { grupo: "Distincion", clave: "mejor_arquero", label: "Mejor arquero", sugerido: 10 },
  { grupo: "Distincion", clave: "mejor_joven", label: "Mejor joven", sugerido: 10 },
];

const CLAVES = CATEGORIAS.map((c) => c.clave);

export default function AdminPuntosEspeciales() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const jugadoresAsync = useAsync(listarJugadoresAdmin, [version]);
  const puntosAsync = useAsync(listarPuntosEspeciales, [version]);

  const cargando = jugadoresAsync.cargando || puntosAsync.cargando;
  const error = jugadoresAsync.error || puntosAsync.error;
  const jugadores = jugadoresAsync.data ?? [];
  const puntos = puntosAsync.data;

  const refrescar = () => setVersion((v) => v + 1);

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold">Puntos especiales</h1>
          <p className="text-xs text-neutral-400">
            Carga a mano los 9 puntajes de cada jugador.
          </p>
        </div>
      </header>

      <div className="px-4">
        <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
          Cada puntaje se <span className="text-oro">SUMA</span> al total en la
          tabla general. El numero gris es el valor{" "}
          <span className="text-oro">sugerido</span>: escribe el que quieras (0 si
          no corresponde).
        </p>
      </div>

      {cargando && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}
      {error && (
        <p className="px-4 text-red-400 text-sm">No se pudo cargar la lista.</p>
      )}

      <ul className="px-4 flex flex-col gap-3">
        {jugadores.map((j) => (
          <FichaPuntos
            key={j.id}
            jugador={j}
            inicial={puntos?.get(j.id) ?? PUNTOS_ESPECIALES_CERO}
            onGuardado={refrescar}
          />
        ))}
      </ul>
    </div>
  );
}

function FichaPuntos({
  jugador,
  inicial,
  onGuardado,
}: {
  jugador: JugadorAdmin;
  inicial: PuntosEspeciales;
  onGuardado: () => void;
}) {
  // Estado local como strings (para que el input pueda quedar vacio al tipear).
  const [valores, setValores] = useState<Record<ClaveEsp, string>>(() =>
    Object.fromEntries(CLAVES.map((k) => [k, String(inicial[k])])) as Record<
      ClaveEsp,
      string
    >
  );
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const total = useMemo(
    () => CLAVES.reduce((acc, k) => acc + (parseInt(valores[k], 10) || 0), 0),
    [valores]
  );

  const cambiar = (k: ClaveEsp, v: string) => {
    setValores((prev) => ({ ...prev, [k]: v }));
    setMsg(null);
  };

  const guardar = async () => {
    const payload = Object.fromEntries(
      CLAVES.map((k) => [k, parseInt(valores[k], 10) || 0])
    ) as unknown as PuntosEspeciales;
    setGuardando(true);
    setMsg(null);
    try {
      await setPuntosEspeciales(jugador.id, payload);
      setMsg("Guardado.");
      onGuardado();
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li
      className={`bg-carbon-card border rounded-2xl p-4 ${
        jugador.activo ? "border-borde" : "border-red-500/40 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-semibold flex items-center gap-2">
          {jugador.alias || jugador.nombre}
          {jugador.es_admin && (
            <span className="text-[10px] font-semibold bg-oro text-carbon px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          )}
          {!jugador.activo && (
            <span className="text-[10px] font-semibold text-red-400">
              (baja)
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wide">
            Total
          </div>
          <div className="text-lg font-bold text-oro tabular-nums leading-none">
            {total}
          </div>
        </div>
      </div>

      <GrupoInputs grupo="Pais" titulo="Pais" valores={valores} cambiar={cambiar} />
      <GrupoInputs
        grupo="Distincion"
        titulo="Distincion"
        valores={valores}
        cambiar={cambiar}
      />

      <button
        onClick={guardar}
        disabled={guardando}
        className="mt-3 w-full py-2 rounded-full bg-oro text-carbon font-bold text-sm disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>}
    </li>
  );
}

function GrupoInputs({
  grupo,
  titulo,
  valores,
  cambiar,
}: {
  grupo: "Pais" | "Distincion";
  titulo: string;
  valores: Record<ClaveEsp, string>;
  cambiar: (k: ClaveEsp, v: string) => void;
}) {
  const items = CATEGORIAS.filter((c) => c.grupo === grupo);
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
        {titulo}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((c) => (
          <label key={c.clave} className="flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-300">{c.label}</span>
            <input
              type="number"
              inputMode="numeric"
              value={valores[c.clave]}
              placeholder={String(c.sugerido)}
              onChange={(e) => cambiar(c.clave, e.target.value)}
              className="w-14 px-2 py-1.5 rounded-lg bg-carbon-soft border border-borde text-sm tabular-nums text-center placeholder:text-neutral-600"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
