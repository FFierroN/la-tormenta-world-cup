// Efectividad de un participante: % de los puntos POSIBLES que realmente saco,
// por fase y en los ultimos N partidos.
//
// "Puntos posibles" de un partido = el MAYOR total que saco CUALQUIER
// participante en ese partido (puntos + puntos_definicion). Es data-driven: si
// 3+ compartieron el exacto y el tope fue 4, el maximo es 4; si alguien clavo
// exacto + alargue/penales y saco 11, el maximo es 11. No depende de adivinar
// tarifas (que cambiaron en el tiempo) ni cuantos compartieron: se lee del dato.
//
// Denominador justo: cuenta TODOS los partidos jugados de la fase (no solo los
// que pronostico). Si no pronostico un partido donde otros sacaron puntos,
// baja su efectividad (oportunidad perdida), igual que el resumen existente.
import type { PrediccionJugada } from "./types";

export interface FaseEfectividad {
  fase: string;
  obtenidos: number;
  posible: number;
  pct: number; // 0..100
}

export interface Efectividad {
  fases: FaseEfectividad[]; // en orden cronologico
  ultimos: { obtenidos: number; posible: number; pct: number; n: number };
}

const totalDe = (r: PrediccionJugada): number =>
  (r.puntos ?? 0) + (r.puntos_definicion ?? 0);

export function calcularEfectividad(
  todas: PrediccionJugada[],
  jugadorId: string,
  ultimosN = 10
): Efectividad {
  const maxPorPartido = new Map<string, number>(); // tope real del partido
  const fasePorPartido = new Map<string, string>();
  const fechaPorPartido = new Map<string, number>();
  const miPorPartido = new Map<string, number>(); // lo que saco este jugador

  for (const r of todas) {
    const tot = totalDe(r);
    maxPorPartido.set(r.partido_id, Math.max(maxPorPartido.get(r.partido_id) ?? 0, tot));
    fasePorPartido.set(r.partido_id, r.fase);
    fechaPorPartido.set(r.partido_id, new Date(r.fecha).getTime());
    if (r.jugador_id === jugadorId) miPorPartido.set(r.partido_id, tot);
  }

  // Agrupa por fase.
  const porFase = new Map<string, { obt: number; pos: number; fechaMin: number }>();
  for (const [pid, max] of maxPorPartido) {
    if (max <= 0) continue; // partido donde nadie saco puntos: no cuenta
    const fase = fasePorPartido.get(pid) ?? "?";
    const f = porFase.get(fase) ?? { obt: 0, pos: 0, fechaMin: Infinity };
    f.obt += miPorPartido.get(pid) ?? 0;
    f.pos += max;
    f.fechaMin = Math.min(f.fechaMin, fechaPorPartido.get(pid) ?? Infinity);
    porFase.set(fase, f);
  }

  const fasesOrden = [...porFase.entries()].map(([fase, v]) => ({
    fase,
    obtenidos: v.obt,
    posible: v.pos,
    pct: v.pos > 0 ? (v.obt / v.pos) * 100 : 0,
    fechaMin: v.fechaMin,
  }));
  fasesOrden.sort((a, b) => a.fechaMin - b.fechaMin);
  const fases: FaseEfectividad[] = fasesOrden.map((f) => ({
    fase: f.fase,
    obtenidos: f.obtenidos,
    posible: f.posible,
    pct: f.pct,
  }));

  // Ultimos N partidos (por fecha desc), solo los que dieron puntos a alguien.
  const partidos = [...maxPorPartido.keys()]
    .filter((pid) => (maxPorPartido.get(pid) ?? 0) > 0)
    .sort((a, b) => (fechaPorPartido.get(b) ?? 0) - (fechaPorPartido.get(a) ?? 0))
    .slice(0, ultimosN);
  let obt = 0;
  let pos = 0;
  for (const pid of partidos) {
    obt += miPorPartido.get(pid) ?? 0;
    pos += maxPorPartido.get(pid) ?? 0;
  }

  return {
    fases,
    ultimos: { obtenidos: obt, posible: pos, pct: pos > 0 ? (obt / pos) * 100 : 0, n: partidos.length },
  };
}

// Etiqueta bonita de la fase (la BD usa "Dieciseisavos"; el resto ya es claro).
export function etiquetaFase(fase: string): string {
  return fase === "Dieciseisavos" ? "16avos" : fase;
}
