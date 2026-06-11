// Pantalla COPA: pestanas para Grupos + cada fase de eliminacion (llaves).
// Antes era "Grupos". El cuadro de llaves es solo visual (no afecta puntos).
import { useEffect, useState } from "react";
import Llave from "../components/Llave";
import TablaGrupos from "../components/TablaGrupos";
import BotonEspeciales from "../components/BotonEspeciales";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useSwipe } from "../lib/useSwipe";
import { TABS_COPA } from "../lib/llaves";

// Arranque del Mundial: 11/06/2026 15:00 hora de Chile (UTC-4).
// La cuenta regresiva apunta aqui y desaparece cuando se cumple.
const INICIO_MUNDIAL = new Date("2026-06-11T15:00:00-04:00").getTime();

export default function Copa() {
  const [tabKey, setTabKey] = useState(TABS_COPA[0].key);
  const { data, cargando, error } = useAsync(listarPartidos, []);
  const partidos = data ?? [];

  const tab = TABS_COPA.find((t) => t.key === tabKey) ?? TABS_COPA[0];
  const esGrupos = tab.fases.length === 0;
  const partidosFase = partidos.filter((p) => tab.fases.includes(p.fase));

  // Swipe: desliza a los lados para cambiar de pestana (con tope en extremos).
  const irRelativo = (delta: number) => {
    const i = TABS_COPA.findIndex((t) => t.key === tabKey);
    const j = Math.min(TABS_COPA.length - 1, Math.max(0, i + delta));
    if (j !== i) setTabKey(TABS_COPA[j].key);
  };
  const swipe = useSwipe(() => irRelativo(1), () => irRelativo(-1));

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <CuentaRegresiva objetivo={INICIO_MUNDIAL} />
        <BotonEspeciales className="mb-3" />
        <h1 className="text-xl font-bold">Copa</h1>
      </header>

      {/* Pestanas con scroll horizontal */}
      <div className="overflow-x-auto no-scrollbar border-b border-borde">
        <div className="flex gap-1 px-4 min-w-max">
          {TABS_COPA.map((t) => {
            const activo = t.key === tabKey;
            return (
              <button
                key={t.key}
                onClick={() => setTabKey(t.key)}
                className={`relative py-2.5 px-3 text-sm whitespace-nowrap transition-colors ${
                  activo ? "text-oro font-bold" : "text-neutral-400 font-medium"
                }`}
              >
                {t.label}
                {activo && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-oro" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div {...swipe} className="min-h-[60vh]">
        {cargando && (
          <p className="px-4 py-6 text-neutral-400 text-sm">Cargando...</p>
        )}
        {error && (
          <p className="px-4 py-6 text-red-400 text-sm">
            No se pudo cargar. Revisa la conexion con Supabase.
          </p>
        )}

        {!cargando && !error && (
          esGrupos ? (
            <TablaGrupos />
          ) : (
            <Llave
              partidos={partidosFase}
              titulo={tab.key === "final" ? "La Gran Final" : undefined}
            />
          )
        )}
      </div>
    </div>
  );
}

/* ---------- Cuenta regresiva al arranque del Mundial ---------- */
// Tickea cada segundo. Cuando el objetivo ya paso, no muestra nada.
function CuentaRegresiva({ objetivo }: { objetivo: number }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= objetivo) return; // ya paso: no arma el intervalo
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  const restante = objetivo - ahora;
  if (restante <= 0) return null; // se elimina solo despues de las 15:00

  const totalSeg = Math.floor(restante / 1000);
  const dias = Math.floor(totalSeg / 86400);
  const horas = Math.floor((totalSeg % 86400) / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  const dd = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="mb-2 bg-carbon-card border border-oro/40 rounded-xl px-3 py-2 text-center"
      aria-live="polite"
    >
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">
        Arranca el Mundial en
      </div>
      <div className="text-lg font-black tabular-nums text-oro">
        {dias > 0 && `${dias}d `}
        {dd(horas)}:{dd(min)}:{dd(seg)}
      </div>
    </div>
  );
}
