// ---------------------------------------------------------------------------
// Motor de "Probabilidad de salir campeon de la quiniela".
//
// Simulacion Monte Carlo de los 4 partidos que faltan (2 semis, 3er puesto y
// final). En cada corrida:
//   1. Se juegan las semis y se decide quien avanza (ponderado por FUERZA).
//   2. Final + 3er puesto -> campeon / subcampeon / 3ro / 4to.
//   3. Se simula el botin de oro (Messi/Mbappe/Kane + lideres actuales).
//   4. Se recalcula el puntaje FINAL de cada participante:
//        base_estable  (partidos + asistidor + distinciones + ajuste, congelado)
//      + puntos_pais    (segun a que ronda llegan los equipos que nombro)
//      + puntos_goleador (si su pick gana el botin simulado)
//   5. Se ordena con el desempate real y se anota quien queda 1o.
//
// prob(campeon quiniela) = veces_que_quedo_1o / iteraciones.
//
// Este modulo es PURO: no toca red ni React. La UI le pasa los datos ya leidos
// (tabla, especiales, goleadores) y recibe los porcentajes.
// ---------------------------------------------------------------------------

// ----- CONFIG EDITABLE (actualizar cuando cambien las semis o las fuerzas) ---
//
// FUERZA de cada semifinalista = su probabilidad de salir campeon (la que nos
// paso el owner). El modelo la usa como PESO relativo en cada cruce, via
// Bradley-Terry:  P(A gana a B) = fuerzaA / (fuerzaA + fuerzaB).
// Se busca por nombre de equipo normalizado; se aceptan alias (es/en).
export const FUERZA_EQUIPOS: { alias: string[]; fuerza: number }[] = [
  { alias: ["francia", "france"], fuerza: 39 },
  { alias: ["espana", "spain"], fuerza: 23 },
  { alias: ["inglaterra", "england"], fuerza: 20 },
  { alias: ["argentina"], fuerza: 18 },
];

// Candidatos al botin de oro que importan (estan en picks de participantes).
// equipoAlias sirve para contar los partidos jugados por su equipo (ritmo de gol)
// y para saber si sigue vivo. Todos son semifinalistas -> juegan 2 partidos mas.
export const CANDIDATOS_GOLEADOR: {
  nombre: string;
  alias: string[];
  equipoAlias: string[];
}[] = [
  { nombre: "Lionel Messi", alias: ["lionel messi", "l. messi", "messi"], equipoAlias: ["argentina"] },
  { nombre: "Kylian Mbappe", alias: ["kylian mbappe", "k. mbappe", "mbappe"], equipoAlias: ["francia", "france"] },
  { nombre: "H. Kane", alias: ["h. kane", "harry kane", "kane"], equipoAlias: ["inglaterra", "england"] },
];

// Cada semifinalista juega exactamente 2 partidos mas (semi + final/3er puesto),
// gane o pierda la semi. Por eso el botin no depende del cruce.
const PARTIDOS_RESTANTES_EQUIPO = 2;

// Tiers de puntos pais (ronda mas alta que logra cada equipo nombrado).
const PTS_CAMPEON = 30;
const PTS_FINALISTA = 12;
const PTS_TERCERO = 8;
const PTS_SEMI = 6;

// ----- Tipos de entrada/salida ---------------------------------------------
export interface ParticipanteSim {
  id: string;
  nombre: string;
  baseEstable: number; // puntos - pais_actual - goleador_actual
  exactos: number;
  aciertos: number;
  fallas: number;
  sinPron: number;
  picksPais: (string | null)[]; // los 7 slots de pais (campeon..semi4)
  pickGoleador: string | null;
}

export interface CorredorGoleo {
  nombre: string; // nombre "bonito" para mostrar/comparar
  goles: number; // goles actuales
  rate: number; // goles por partido (0 si su equipo ya quedo fuera)
}

export interface EntradaSim {
  participantes: ParticipanteSim[];
  // Semis: P101 = a vs b, P102 = c vs d. Nombres tal como estan en la BD.
  semis: { a: string; b: string; c: string; d: string };
  corredores: CorredorGoleo[]; // contendientes al botin
  iteraciones?: number;
}

export interface FilaProb {
  id: string;
  nombre: string;
  prob: number; // 0..1
}

export interface SalidaSim {
  quiniela: FilaProb[]; // prob de salir campeon de la quiniela
  goleador: { nombre: string; prob: number }[]; // prob de ganar el botin
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

// Fuerza de un equipo por su nombre (normalizado). 1 si no esta en la config.
export function fuerzaDe(equipo: string): number {
  const n = norm(equipo);
  const f = FUERZA_EQUIPOS.find((e) => e.alias.includes(n));
  return f ? f.fuerza : 1;
}

// Muestra Poisson (Knuth). Para lambda chico (goles) es mas que suficiente.
function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Gana A vs B por fuerza (Bradley-Terry). Devuelve true si gana A.
function ganaA(fa: number, fb: number): boolean {
  return Math.random() < fa / (fa + fb);
}

// ----- Nucleo: una simulacion del bracket ----------------------------------
// Devuelve el tier de puntos de cada equipo (mapa nombre-normalizado -> pts).
function simularBracket(semis: EntradaSim["semis"]): Map<string, number> {
  const { a, b, c, d } = semis;
  const fa = fuerzaDe(a);
  const fb = fuerzaDe(b);
  const fc = fuerzaDe(c);
  const fd = fuerzaDe(d);

  // Semis: ganadores van a la final; perdedores al 3er puesto.
  const gan1 = ganaA(fa, fb) ? a : b;
  const per1 = gan1 === a ? b : a;
  const gan2 = ganaA(fc, fd) ? c : d;
  const per2 = gan2 === c ? d : c;

  // Final.
  const campeon = ganaA(fuerzaDe(gan1), fuerzaDe(gan2)) ? gan1 : gan2;
  const sub = campeon === gan1 ? gan2 : gan1;

  // 3er puesto.
  const tercero = ganaA(fuerzaDe(per1), fuerzaDe(per2)) ? per1 : per2;
  const cuarto = tercero === per1 ? per2 : per1;

  const tiers = new Map<string, number>();
  tiers.set(norm(campeon), PTS_CAMPEON);
  tiers.set(norm(sub), PTS_FINALISTA);
  tiers.set(norm(tercero), PTS_TERCERO);
  tiers.set(norm(cuarto), PTS_SEMI);
  return tiers;
}

// Botin de oro simulado: nombre(s) normalizado(s) con mas goles. Empate -> varios.
function simularBotin(corredores: CorredorGoleo[]): Set<string> {
  let max = -1;
  const finales: { n: string; g: number }[] = [];
  for (const c of corredores) {
    const g = c.goles + poisson(c.rate * PARTIDOS_RESTANTES_EQUIPO);
    finales.push({ n: norm(c.nombre), g });
    if (g > max) max = g;
  }
  const ganadores = new Set<string>();
  for (const f of finales) if (f.g === max && max > 0) ganadores.add(f.n);
  return ganadores;
}

// Puntos pais de un participante dado el bracket simulado: por cada equipo
// DISTINTO que nombro, cobra el tier de ese equipo (0 si no llego a semis).
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

  const botinWins = new Map<string, number>();
  for (const c of CANDIDATOS_GOLEADOR) botinWins.set(norm(c.nombre), 0);

  // Pre-normalizamos el pick de goleador de cada participante.
  const pickGolNorm = P.map((p) => norm(p.pickGoleador));

  for (let it = 0; it < N; it++) {
    const tiers = simularBracket(entrada.semis);
    const botin = simularBotin(entrada.corredores);

    // Anota prob de botin de los candidatos que seguimos.
    for (const n of botin) if (botinWins.has(n)) botinWins.set(n, botinWins.get(n)! + 1);

    // Puntaje final + claves de desempate de cada participante.
    let mejor = -Infinity;
    let mejores: number[] = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const pais = puntosPais(p.picksPais, tiers);
      const gol = pickGolNorm[i] && botin.has(pickGolNorm[i]) ? 15 : 0;
      const total = p.baseEstable + pais + gol;
      // Desempate: puntos desc, exactos desc, aciertos desc, (fallas+sin) asc, id asc.
      // Empaquetamos en una clave comparable (mayor = mejor).
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
    // Reparte la victoria si hay empate perfecto (raro). id asc como ultimo criterio.
    if (mejores.length === 1) {
      const p = P[mejores[0]];
      wins.set(p.id, wins.get(p.id)! + 1);
    } else {
      const frac = 1 / mejores.length;
      for (const idx of mejores) {
        const p = P[idx];
        wins.set(p.id, wins.get(p.id)! + frac);
      }
    }
  }

  const quiniela: FilaProb[] = P.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    prob: (wins.get(p.id) ?? 0) / N,
  })).sort((a, b) => b.prob - a.prob);

  const goleador = CANDIDATOS_GOLEADOR.map((c) => ({
    nombre: c.nombre,
    prob: (botinWins.get(norm(c.nombre)) ?? 0) / N,
  })).sort((a, b) => b.prob - a.prob);

  return { quiniela, goleador, iteraciones: N };
}
