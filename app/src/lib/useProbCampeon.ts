// Hook compartido: reune los datos, corre la simulacion Monte Carlo
// (lib/probCampeon) y devuelve el resultado + un mapa jugador_id -> prob.
// Lo usan la pestana Clasica (ranking completo) y el detalle de cada
// participante (su cajita de %), sin duplicar logica.
//
// El BRACKET se lee de la tabla partidos (slots P101/P102 semis, P103 3er,
// P104 final): si una llave ya se jugo usa el resultado real; si falta, el motor
// la simula. Asi la estadistica AVANZA SOLA a medida que se juegan los partidos.
import { useMemo } from "react";
import { useAsync } from "./useAsync";
import {
  obtenerTabla,
  obtenerDesgloseTormenta,
  todasEspeciales,
  listarPartidos,
  leerProbConfig,
  resultadosRealesEspeciales,
} from "./data";
import {
  simularQuiniela,
  type ParticipanteSim,
  type SalidaSim,
  type Tendencia,
  type PartidoBracket,
  type ProbConfig,
} from "./probCampeon";
import type { Partido } from "./types";

// Slots de las 4 llaves finales, en orden.
const SLOTS_FINALES: PartidoBracket["slot"][] = ["P101", "P102", "P103", "P104"];

// Ganador/perdedor REAL de una llave ya jugada (penales > alargue > 90').
function ganadorReal(p: Partido): [string, string] {
  if (p.ganador_penales === "local") return [p.equipo_local, p.equipo_visita];
  if (p.ganador_penales === "visita") return [p.equipo_visita, p.equipo_local];
  const gl = (p.goles_local ?? 0) + (p.alargue_local ?? 0);
  const gv = (p.goles_visita ?? 0) + (p.alargue_visita ?? 0);
  return gl >= gv
    ? [p.equipo_local, p.equipo_visita]
    : [p.equipo_visita, p.equipo_local];
}

interface DatosSim {
  participantes: ParticipanteSim[];
  bracket: PartidoBracket[];
  partidosFuturos: number;
  config: ProbConfig | null;
  confirmados: Record<string, string | null>;
}

async function reunirDatos(): Promise<DatosSim> {
  const [tabla, desglose, todasEsp, partidos, config, reales] = await Promise.all([
    obtenerTabla(),
    obtenerDesgloseTormenta(),
    todasEspeciales(),
    listarPartidos(),
    leerProbConfig(),
    resultadosRealesEspeciales(),
  ]);

  // ----- Bracket real desde la BD -----
  const bracket: PartidoBracket[] = [];
  let partidosFuturos = 0;
  for (const slot of SLOTS_FINALES) {
    const p = partidos.find((x) => x.slot === slot);
    const jugado = !!p && p.estado === "final" && p.goles_local != null;
    if (!jugado) partidosFuturos++;
    const [ganador, perdedor] = jugado ? ganadorReal(p!) : [null, null];
    bracket.push({
      slot,
      local: p?.equipo_local ?? "",
      visita: p?.equipo_visita ?? "",
      jugado,
      ganador,
      perdedor,
    });
  }

  const sinPronPorId = new Map<string, number>();
  for (const d of desglose) sinPronPorId.set(d.jugador_id, d.no_pronosticados);

  // ----- Premios YA CONFIRMADOS (Pieza B: fijar lo decidido, no simularlo) -----
  // Las 3 distinciones FIFA: confirmadas apenas el admin las carga.
  // Goleador/asistidor: confirmados solo cuando la FINAL ya se jugo (torneo
  // terminado) y hay un lider unico (si hay empate, se sigue simulando).
  const finalJugada = bracket.find((b) => b.slot === "P104")?.jugado ?? false;
  const confirmados: Record<string, string | null> = {
    mejor_jugador: reales.mejor_jugador || null,
    mejor_arquero: reales.mejor_arquero || null,
    mejor_joven: reales.mejor_joven || null,
    goleador: finalJugada && reales.goleadores.length === 1 ? reales.goleadores[0] : null,
    asistidor: finalJugada && reales.asistidores.length === 1 ? reales.asistidores[0] : null,
  };

  // Tendencia historica de cada jugador (tasas por categoria sobre TODOS los
  // partidos finalizados). Modela sus partidos futuros: quien suele acertar
  // tiene upside real -> nadie queda en 0% artificial.
  const tendenciaPorId = new Map<string, Tendencia>();
  for (const d of desglose) {
    const denom =
      d.exactos + d.diferencias + d.aciertos + d.fallas + d.no_pronosticados;
    tendenciaPorId.set(
      d.jugador_id,
      denom > 0
        ? {
            exacto: d.exactos / denom,
            diferencia: d.diferencias / denom,
            acierto: d.aciertos / denom,
            falla: d.fallas / denom,
            sin: d.no_pronosticados / denom,
          }
        : { exacto: 0, diferencia: 0, acierto: 0, falla: 0, sin: 1 }
    );
  }

  const picksPorId = new Map<string, (typeof todasEsp)[number]>();
  for (const e of todasEsp) picksPorId.set(e.jugador_id, e);

  const participantes = tabla.map((f): ParticipanteSim => {
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
      tendencia:
        tendenciaPorId.get(f.jugador_id) ??
        { exacto: 0, diferencia: 0, acierto: 0, falla: 0, sin: 1 },
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

  return { participantes, bracket, partidosFuturos, config, confirmados };
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
    return simularQuiniela({
      participantes: data.participantes,
      bracket: data.bracket,
      partidosFuturos: data.partidosFuturos,
      fuerzas: data.config?.fuerzas,
      cuotas: data.config?.cuotas,
      confirmados: data.confirmados,
      iteraciones: 10000,
    });
  }, [data]);

  const probPorId = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of sim?.quiniela ?? []) m.set(f.id, f.prob);
    return m;
  }, [sim]);

  return { sim, probPorId, cargando, error };
}
