// Regla "Casi": cuantas veces estuviste a 1 gol del marcador EXACTO.
//
// Cuenta como "casi" un pronostico de un partido YA JUGADO (final) cuando:
//   1. la distancia total al marcador real es exactamente 1 gol, es decir
//      |pred_local - real_local| + |pred_visita - real_visita| == 1, y
//   2. tanto tu pronostico como el resultado real fueron VICTORIA.
//
// Empates y derrotas NO cuentan (en cualquiera de los dos lados). Con distancia
// total = 1 el ganador nunca se "voltea" (cambiar de ganador exige 2+ goles de
// diferencia), por eso basta con exigir que ambos sean victoria para garantizar
// que son del mismo lado. Ejemplos que SI cuentan: real 2-0 / pred 1-0; real
// 3-2 / pred 3-1; real 0-2 / pred 0-1. Ejemplos que NO: real 1-1 / pred 1-0
// (empate real), real 2-1 / pred 2-2 (empate pronosticado).
import type { MiPrediccion, PrediccionJugada } from "./types";

export function esCasi(p: MiPrediccion): boolean {
  if (p.estado !== "final") return false;
  if (p.goles_local == null || p.goles_visita == null) return false;

  const distancia =
    Math.abs(p.pred_local - p.goles_local) +
    Math.abs(p.pred_visita - p.goles_visita);
  if (distancia !== 1) return false;

  const realFueVictoria = p.goles_local !== p.goles_visita;
  const predFueVictoria = p.pred_local !== p.pred_visita;
  return realFueVictoria && predFueVictoria;
}

// Filtra la lista de predicciones dejando solo los "casi", mas reciente arriba.
export function soloCasi(preds: MiPrediccion[]): MiPrediccion[] {
  return preds.filter(esCasi).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// Una fila del ranking de "casi" (mini tabla de la pestana Casi).
export interface FilaCasi {
  jugador_id: string;
  nombre: string;
  casi: number; // cuantos "casi" acumula
  jugadas: number; // partidos jugados con pronostico (contexto)
  posicion: number; // 1-based, con empates compartiendo puesto
}

// Arma el ranking por cantidad de "casi" (desc). Incluye a TODOS los jugadores
// de 'nombres' (los que no pronosticaron quedan en 0), ordena por casi y, a
// igualdad, por nombre. La posicion usa ranking de competencia (1,2,2,4...).
export function rankingCasi(
  todas: PrediccionJugada[],
  nombres: Map<string, string>
): FilaCasi[] {
  const acc = new Map<string, { casi: number; jugadas: number }>();
  // Sembramos a todos en 0 para que la tabla muestre el plantel completo.
  for (const id of nombres.keys()) acc.set(id, { casi: 0, jugadas: 0 });
  for (const p of todas) {
    const a = acc.get(p.jugador_id) ?? { casi: 0, jugadas: 0 };
    a.jugadas += 1;
    if (esCasi(p)) a.casi += 1;
    acc.set(p.jugador_id, a);
  }

  const filas: FilaCasi[] = [...acc.entries()].map(([jugador_id, v]) => ({
    jugador_id,
    nombre: nombres.get(jugador_id) ?? `#${jugador_id}`,
    casi: v.casi,
    jugadas: v.jugadas,
    posicion: 0,
  }));
  filas.sort((a, b) => b.casi - a.casi || a.nombre.localeCompare(b.nombre));

  let pos = 0;
  let prev = -1;
  filas.forEach((f, i) => {
    if (f.casi !== prev) {
      pos = i + 1;
      prev = f.casi;
    }
    f.posicion = pos;
  });
  return filas;
}
