// Pantalla COPA: tres pestanas -> "Llaves" (cuadro de eliminacion, por defecto),
// "Grupos" (tabla de posiciones) y "Estadisticas" (rankings individuales del
// torneo: goleadores, asist., goles+asist., amarillas, rojas, penales).
// El cuadro por fase ya no vive aqui en pestanas separadas: todo el bracket
// esta dentro de "Llaves".
import { useEffect, useState } from "react";
import LlavesView from "../components/LlavesView";
import TablaGrupos from "../components/TablaGrupos";
import PanelEstadisticas from "../components/PanelEstadisticas";
import PronosticoView from "./PronosticoView";
import { useSwipe } from "../lib/useSwipe";
import { TABS_COPA, TAB_COPA_DEFAULT } from "../lib/llaves";

// Arranque del Mundial: 11/06/2026 15:00 hora de Chile (UTC-4).
// La cuenta regresiva apunta aqui y desaparece cuando se cumple.
const INICIO_MUNDIAL = new Date("2026-06-11T15:00:00-04:00").getTime();

export default function Copa() {
  // Persistimos la pestana activa en sessionStorage: si el user entra a
  // /copa/estadisticas/:tipo (pantalla de detalle) y vuelve con back, cae de
  // nuevo en la pestana "Estadisticas", no en la default "Llaves".
  // Ojo: default es TAB_COPA_DEFAULT ("llaves"), NO el primer elemento del
  // array. Asi puedo reordenar el array visual sin cambiar la default.
  const [tabKey, setTabKey] = useState(() => {
    const guardado = typeof window !== "undefined" ? sessionStorage.getItem("copa:tab") : null;
    const valido = TABS_COPA.some((t) => t.key === guardado);
    return valido ? (guardado as string) : TAB_COPA_DEFAULT;
  });

  useEffect(() => {
    sessionStorage.setItem("copa:tab", tabKey);
  }, [tabKey]);

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
        <h1 className="text-xl font-bold">Copa</h1>
      </header>

      {/* Pestanas */}
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
        {tabKey === "grupos" ? (
          <TablaGrupos />
        ) : tabKey === "estadisticas" ? (
          <PanelEstadisticas />
        ) : tabKey === "pronostico" ? (
          <PronosticoView />
        ) : (
          <LlavesView />
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
