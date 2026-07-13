// ---------------------------------------------------------------------------
// Motor de "Probabilidad de salir campeon de la quiniela".
//
// Simulacion Monte Carlo de lo que falta del Mundial. En cada corrida:
//   1. Se juega el bracket (2 semis + final + 3er puesto) ponderado por FUERZA,
//      para saber a que ronda llega cada equipo -> puntos PAIS de cada pick.
//   2. Se sortea el ganador de cada PREMIO individual (goleador, asistidor,
//      balon de oro, joven, arquero) usando probabilidades de MERCADO.
//   3. Se recalcula el puntaje FINAL de cada participante:
//        base_estable (partidos + ajuste, congelado)
//      + puntos_pais  (segun a que ronda llegan los equipos que nombro)
//      + premios       (los pts de cada premio que su pick acerto)
//   4. Se ordena con el desempate real y se anota quien queda 1o.
//
// prob(campeon quiniela) = veces_que_quedo_1o / iteraciones.
//
// Modulo PURO: no toca red ni React. La UI le pasa datos ya leidos y recibe %.
// ---------------------------------------------------------------------------

// ----- CONFIG EDITABLE (actualizar si cambian semis / fuerzas / mercado) -----
//
// FUERZA de cada semifinalista = su prob de salir campeon. Se usa como PESO
// relativo en cada cruce (Bradley-Terry): P(A gana a B) = fa / (fa + fb).
export const FUERZA_EQUIPOS: { alias: string[]; fuerza: number }[] = [
  { alias: ["francia", "france"], fuerza: 39 },
  { alias: ["espana", "spain"], fuerza: 23 },
  { alias: ["inglaterra", "england"], fuerza: 20 },
  { alias: ["argentina"], fuerza: 18 },
];

// PREMIOS individuales, con la probabilidad de MERCADO (punto medio del rango)
// de cada candidato. Si la suma < 1, el resto es "otro" (no matchea ningun pick).
// campo = nombre del pick del participante que se compara. pts = valor del premio.
export interface Candidato {
  nombre: string;
  alias: string[];
  prob: number;
}
export interface Premio {
  key: string;
  label: string;
  campo: "goleador" | "asistidor" | "mejor_jugador" | "mejor_arquero" | "mejor_joven";
  pts: number;
  candidatos: Candidato[];
}

export const PREMIOS: Premio[] = [
  {
    key: "goleador",
    label: "Bota de Oro (goleador)",
    campo: "goleador",
    pts: 15,
    candidatos: [
      { nombre: "Kylian Mbappe", alias: ["kylian mbappe", "k. mbappe", "mbappe"], prob: 0.425 },
      { nombre: "Lionel Messi", alias: ["lionel messi", "l. messi", "messi"], prob: 0.375 },
      { nombre: "Harry Kane", alias: ["harry kane", "h. kane", "kane"], prob: 0.125 },
      { nombre: "Jude Bellingham", alias: ["jude bellingham", "j. bellingham", "bellingham"], prob: 0.075 },
    ],
  },
  {
    key: "asistidor",
    label: "Maximo asistidor",
    campo: "asistidor",
    pts: 10,
    candidatos: [
      { nombre: "Michael Olise", alias: ["michael olise", "m. olise", "olise"], prob: 0.45 },
      { nombre: "Lamine Yamal", alias: ["lamine yamal", "l. yamal", "yamal"], prob: 0.225 },
      { nombre: "Jude Bellingham", alias: ["jude bellingham", "j. bellingham", "bellingham"], prob: 0.125 },
      { nombre: "Lionel Messi", alias: ["lionel messi", "l. messi", "messi"], prob: 0.10 },
    ],
  },
  {
    key: "mejor_jugador",
    label: "Balon de Oro (mejor jugador)",
    campo: "mejor_jugador",
    pts: 10,
    candidatos: [
      { nombre: "Kylian Mbappe", alias: ["kylian mbappe", "k. mbappe", "mbappe"], prob: 0.40 },
      { nombre: "Lionel Messi", alias: ["lionel messi", "l. messi", "messi"], prob: 0.33 },
      { nombre: "Jude Bellingham", alias: ["jude bellingham", "j. bellingham", "bellingham"], prob: 0.20 },
      { nombre: "Harry Kane", alias: ["harry kane", "h. kane", "kane"], prob: 0.125 },
    ],
  },
  {
    key: "mejor_joven",
    label: "Mejor jugador joven",
    campo: "mejor_joven",
    pts: 10,
    candidatos: [
      { nombre: "Lamine Yamal", alias: ["lamine yamal", "l. yamal", "yamal"], prob: 0.65 },
      { nombre: "Warren Zaire-Emery", alias: ["warren zaire-emery", "zaire-emery", "zaire emery"], prob: 0.125 },
    ],
  },
  {
    key: "mejor_arquero",
    label: "Guante de Oro (arquero)",
    campo: "mejor_arquero",
    pts: 10,
    candidatos: [
      { nombre: "Mike Maignan", alias: ["mike maignan", "m. maignan", "maignan"], prob: 0.475 },
      { nombre: "Jordan Pickford", alias: ["jordan pickford", "j. pickford", "pickford"], prob: 0.225 },
      { nombre: "Emiliano Martinez", alias: ["emiliano martinez", "e. martinez", "dibu martinez", "martinez"], prob: 0.175 },
      { nombre: "Unai Simon", alias: ["unai simon", "u. simon", "simon"], prob: 0.10 },
    ],
  },
];

// Tiers de puntos pais (ronda mas alta que logra cada equipo nombrado).
const PTS_CAMPEON = 30;
const PTS_FINALISTA = 12;
const PTS_TERCERO = 8;
const PTS_SEMI = 6;

// ----- Tipos de entrada/salida ---------------------------------------------
export interface ParticipanteSim {
  id: string;
  nombre: string;
  baseEstable: number; // puntos - TODOS los especiales actuales (pais + premios)
  exactos: number;
  aciertos: number;
  fallas: number;
  sinPron: number;
  picksPais: (string | null)[]; // los 7 slots de pais (campeon..semi4)
  picksPremio: Record<Premio["campo"], string | null>;
}

export interface EntradaSim {
  participantes: ParticipanteSim[];
  semis: { a: string; b: string; c: string; d: string };
  iteraciones?: number;
}

export interface FilaProb {
  id: string;
  nombre: string;
  prob: number; // 0..1
}

export interface SalidaSim {
  quiniela: FilaProb[];
  // Prob COMPUTADA de cada premio por candidato (deberia ~ el mercado de config).
  premios: { key: string; label: string; filas: { nombre: string; prob: number }[] }[];
  iteraciones: number;
}

// ----- Utilidades ----------------------------------------------------------
export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function fuerzaDe(equipo: string): number {
  const n = norm(equipo);
  const f = FUERZA_EQUIPOS.find((e) => e.alias.includes(n));
  return f ? f.fuerza : 1;
}

function ganaA(fa: number, fb: number): boolean {
  return Math.random() < fa / (fa + fb);
}

// Sortea el ganador de un premio segun probabilidades de mercado.
// Devuelve el nombre normalizado, o null si gano "otro" (fuera de la lista).
function sortearPremio(premio: Premio): string | null {
  const total = premio.candidatos.reduce((s, c) => s + c.prob, 0);
  // Si total>1 (mercado sobre-100 por redondeo), normalizamos a 1.
  const r = Math.random() * Math.max(1, total);
  let acc = 0;
  for (const c of premio.candidatos) {
    acc += c.prob;
    if (r < acc) return norm(c.nombre);
  }
  return null; // "otro": no matchea ningun pick
}

// Bracket simulado -> tier de puntos por equipo (nombre normalizado).
function simularBracket(semis: EntradaSim["semis"]): Map<string, number> {
  const { a, b, c, d } = semis;
  const gan1 = ganaA(fuerzaDe(a), fuerzaDe(b)) ? a : b;
  const per1 = gan1 === a ? b : a;
  const gan2 = ganaA(fuerzaDe(c), fuerzaDe(d)) ? c : d;
  const per2 = gan2 === c ? d : c;
  const campeon = ganaA(fuerzaDe(gan1), fuerzaDe(gan2)) ? gan1 : gan2;
  const sub = campeon === gan1 ? gan2 : gan1;
  const tercero = ganaA(fuerzaDe(per1), fuerzaDe(per2)) ? per1 : per2;
  const cuarto = tercero === per1 ? per2 : per1;

  const tiers = new Map<string, number>();
  tiers.set(norm(campeon), PTS_CAMPEON);
  tiers.set(norm(sub), PTS_FINALISTA);
  tiers.set(norm(tercero), PTS_TERCERO);
  tiers.set(norm(cuarto), PTS_SEMI);
  return tiers;
}

// Puntos pais: por cada equipo DISTINTO nombrado, el tier de ese equipo.
function puntosPais(picks: (string | null)[], tiers: Map<string, number>): number {
  const vistos = new Set<string>();
  let total = 0;
  for (const p of picks) {
    if (!p || !p.trim()) continue;
    const n = norm(p);
    if (vistos.has(n)) continue;
    vistos.add(n);
    total += tiers.get(n) ?? 0;
  }
  return total;
}

// ----- Simulacion completa -------------------------------------------------
export function simularQuiniela(entrada: EntradaSim): SalidaSim {
  const N = entrada.iteraciones ?? 10000;
  const P = entrada.participantes;
  const wins = new Map<string, number>();
  for (const p of P) wins.set(p.id, 0);

  // Contador de ganadores por premio (para reportar prob computada).
  const premioWins: Record<string, Map<string, number>> = {};
  for (const pr of PREMIOS) premioWins[pr.key] = new Map();

  // Pre-normalizamos los picks de premio de cada participante.
  const picksNorm = P.map((p) => {
    const m: Partial<Record<Premio["campo"], string>> = {};
    for (const pr of PREMIOS) m[pr.campo] = norm(p.picksPremio[pr.campo]);
    return m as Record<Premio["campo"], string>;
  });

  for (let it = 0; it < N; it++) {
    const tiers = simularBracket(entrada.semis);

    // Sortea ganador de cada premio.
    const ganadores: Record<string, string | null> = {};
    for (const pr of PREMIOS) {
      const g = sortearPremio(pr);
      ganadores[pr.key] = g;
      if (g) premioWins[pr.key].set(g, (premioWins[pr.key].get(g) ?? 0) + 1);
    }

    // Puntaje final de cada participante + clave de desempate.
    let mejor = -Infinity;
    let mejores: number[] = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      let total = p.baseEstable + puntosPais(p.picksPais, tiers);
      for (const pr of PREMIOS) {
        const g = ganadores[pr.key];
        if (g && picksNorm[i][pr.campo] === g) total += pr.pts;
      }
      // Desempate: puntos desc, exactos desc, aciertos desc, (fallas+sin) asc.
      const score =
        total * 1e12 +
        p.exactos * 1e9 +
        p.aciertos * 1e6 -
        (p.fallas + p.sinPron) * 1e3;
      if (score > mejor) {
        mejor = score;
        mejores = [i];
      } else if (score === mejor) {
        mejores.push(i);
      }
    }
    if (mejores.length === 1) {
      const p = P[mejores[0]];
      wins.set(p.id, wins.get(p.id)! + 1);
    } else {
      const frac = 1 / mejores.length;
      for (const idx of mejores) wins.set(P[idx].id, wins.get(P[idx].id)! + frac);
    }
  }

  const quiniela: FilaProb[] = P.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    prob: (wins.get(p.id) ?? 0) / N,
  })).sort((a, b) => b.prob - a.prob);

  const premios = PREMIOS.map((pr) => ({
    key: pr.key,
    label: pr.label,
    filas: pr.candidatos
      .map((c) => ({
        nombre: c.nombre,
        prob: (premioWins[pr.key].get(norm(c.nombre)) ?? 0) / N,
      }))
      .sort((a, b) => b.prob - a.prob),
  }));

  return { quiniela, premios, iteraciones: N };
}
