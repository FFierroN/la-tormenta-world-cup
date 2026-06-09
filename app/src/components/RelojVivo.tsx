import { useEffect, useState } from "react";
import type { Partido } from "../lib/types";

// Cronometro en vivo: ANCLADO por la API (robot cada ~15 min), ANIMADO por el
// navegador (tickea solo, gratis, sin gastar requests). Entre polls cuenta
// localmente desde (minuto + minuto_at) y se re-ancla cuando llega dato fresco.
//
// Bordes domesticados:
//  - Se topa en 45' (1er tiempo) y 90' (2do) hasta que el robot confirme el
//    cambio de estado -> nunca muestra un minuto imposible.
//  - Si se pasa del tope, muestra "45+" / "90+" (tiempo anadido estimado).
//  - Solo tickea en 'en_vivo' y 'alargue'. En entretiempo/penales no aplica.

// Estados en los que el reloj corre.
const ESTADOS_TICKEAN: Partido["estado"][] = ["en_vivo", "alargue"];

// Tope segun el tramo del partido (a partir del minuto ancla).
function tope(base: number): number {
  if (base <= 45) return 45; // primer tiempo
  if (base <= 90) return 90; // segundo tiempo
  return 120; // alargue
}

export default function RelojVivo({ partido }: { partido: Partido }) {
  // Reloj local: re-renderiza cada segundo para avanzar el conteo.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ESTADOS_TICKEAN.includes(partido.estado)) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [partido.estado]);

  if (!ESTADOS_TICKEAN.includes(partido.estado)) return null;
  if (partido.minuto == null || partido.minuto_at == null) return null;

  const base = partido.minuto;
  const ancla = new Date(partido.minuto_at).getTime();
  const transcurridoExtra = Math.max(0, Math.floor((Date.now() - ancla) / 60000));
  const minutoReal = base + transcurridoExtra;

  const limite = tope(base);
  const mostrado = Math.min(minutoReal, limite);
  const enAnadido = minutoReal > limite;

  return (
    <div className="text-sm font-semibold text-red-400 mt-0.5 tabular-nums">
      {mostrado}
      {enAnadido ? "+" : ""}&apos;
    </div>
  );
}
