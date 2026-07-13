// Hook compartido: reune los datos, corre la simulacion Monte Carlo
// (lib/probCampeon) y devuelve el resultado + un mapa jugador_id -> prob.
// Lo usan la pestana Clasica (ranking completo) y el detalle de cada
// participante (su cajita de %), sin duplicar logica.
import { useMemo } from "react";
import { useAsync } from "./useAsync";
import {
  obtenerTabla,
  obtenerDesgloseTormenta,
  todasEspeciales,
} from "./data";
import { simularQuiniela, type ParticipanteSim, type SalidaSim } from "./probCampeon";

// Semifinales cableadas aca (matchean con FUERZA_EQUIPOS en probCampeon.ts).
// Si cambian los cruces, se ajustan ambos lugares.
export const SEMIS = { a: "Francia", b: "España", c: "Inglaterra", d: "Argentina" };

async function reunirDatos(): Promise<ParticipanteSim[]> {
  const [tabla, desglose, todasEsp] = await Promise.all([
    obtenerTabla(),
    obtenerDesgloseTormenta(),
    todasEspeciales(),
  ]);

  const sinPronPorId = new Map<string, number>();
  for (const d of desglose) sinPronPorId.set(d.jugador_id, d.no_pronosticados);

  const picksPorId = new Map<string, (typeof todasEsp)[number]>();
  for (const e of todasEsp) picksPorId.set(e.jugador_id, e);

  return tabla.map((f) => {
    // tabla.puntos HOY = solo partidos + ajuste (los especiales estan en 0 hasta
    // la final). Por eso baseEstable = puntos directo; el sim suma pais + premios
    // simulados encima, sin restar nada (evita el bug de restar puntos fantasma).
    const picks = picksPorId.get(f.jugador_id);
    return {
      id: f.jugador_id,
      nombre: f.alias ?? f.nombre,
      baseEstable: f.puntos,
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

export interface ProbCampeon {
  sim: SalidaSim | null;
  probPorId: Map<string, number>;
  cargando: boolean;
  error: string | null;
}

export function useProbCampeon(): ProbCampeon {
  const { data, cargando, error } = useAsync(reunirDatos, []);

  const sim = useMemo(() => {
    if (!data) return null;
    return simularQuiniela({ participantes: data, semis: SEMIS, iteraciones: 10000 });
  }, [data]);

  const probPorId = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of sim?.quiniela ?? []) m.set(f.id, f.prob);
    return m;
  }, [sim]);

  return { sim, probPorId, cargando, error };
}
