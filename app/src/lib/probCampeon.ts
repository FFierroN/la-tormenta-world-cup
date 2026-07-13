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
export const FUERZA_EQUIPOS: { nombre: string; alias: string[]; fuerza: number }[] = [
  { nombre: "Francia", alias: ["francia", "france"], fuerza: 39 },
  { nombre: "España", alias: ["espana", "spain"], fuerza: 23 },
  { nombre: "Inglaterra", alias: ["inglaterra", "england"], fuerza: 20 },
  { nombre: "Argentina", alias: ["argentina"], fuerza: 18 },
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

// Puntos por categoria de pronostico de partido (tarifa unica de la copa).
// Se usan para modelar los partidos FUTUROS via la tendencia de cada jugador.
const PTS_EXACTO = 6;
const PTS_DIFERENCIA = 3;
const PTS_ACIERTO = 2;

// ----- Tipos de entrada/salida ---------------------------------------------
// Tendencia historica de un jugador: con que frecuencia cae en cada categoria
// (sobre TODOS los partidos ya finalizados). Suman ~1. Modela sus partidos
// futuros: si suele acertar, tiene upside; si suele no pronosticar, poco.
export interface Tendencia {
  exacto: number;
  diferencia: number;
  acierto: number;
  falla: number;
  sin: number; // no pronostico
}

export interface ParticipanteSim {
  id: string;
  nombre: string;
  baseEstable: number; // puntos actuales (partidos + ajuste; especiales en 0 hoy)
  exactos: number;
  aciertos: number;
  fallas: number;
  sinPron: number;
  tendencia: Tendencia; // tasas historicas para simular los partidos futuros
  picksPais: (string | null)[]; // los 7 slots de pais (campeon..semi4)
  picksPremio: Record<Premio["campo"], string | null>;
}

export interface EntradaSim {
  participantes: ParticipanteSim[];
  // Estado REAL de las 4 llaves finales (leido de la BD). Cada corrida usa el
  // resultado si ya se jugo, o lo simula por fuerza si falta.
  bracket: PartidoBracket[];
  partidosFuturos?: number; // cuantos partidos faltan (para la tendencia)
  // Fuerza por equipo (nombre normalizado -> peso). Si falta, usa el default
  // FUERZA_EQUIPOS. Permite hacerla editable por el admin sin tocar codigo.
  fuerzas?: Record<string, number>;
  // Cuotas de premios (premioKey -> candidatoNorm -> prob 0..1). Override del
  // mercado por defecto; tambien editable por el admin.
  cuotas?: Record<string, Record<string, number>>;
  // Premios YA CONFIRMADOS (premioKey -> nombre real del ganador). Si esta,
  // ese premio NO se simula: suma fijo a quien lo acerto (Pieza B).
  confirmados?: Record<string, string | null>;
  iteraciones?: number;
}

// Config editable por el admin (se guarda en la tabla configuracion como JSON).
// fuerzas: nombre-de-equipo-normalizado -> peso.
// cuotas: premioKey -> candidatoNorm -> PORCENTAJE (0..100, como lo piensa el admin).
export interface ProbConfig {
  fuerzas: Record<string, number>;
  cuotas: Record<string, Record<string, number>>;
}

// Config por defecto derivada de los valores cableados (FUERZA_EQUIPOS +
// PREMIOS). Sirve para pre-llenar el formulario del admin la primera vez.
export function configPorDefecto(): ProbConfig {
  const fuerzas: Record<string, number> = {};
  for (const e of FUERZA_EQUIPOS) fuerzas[norm(e.nombre)] = e.fuerza;
  const cuotas: Record<string, Record<string, number>> = {};
  for (const pr of PREMIOS) {
    cuotas[pr.key] = {};
    for (const c of pr.candidatos) cuotas[pr.key][norm(c.nombre)] = Math.round(c.prob * 1000) / 10;
  }
  return { fuerzas, cuotas };
}

// Una llave final tal como viene de la BD (ya resuelta o por jugar).
export interface PartidoBracket {
  slot: "P101" | "P102" | "P103" | "P104";
  local: string;
  visita: string;
  jugado: boolean;
  ganador: string | null; // solo si jugado
  perdedor: string | null; // solo si jugado
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

// Resuelve el pick de un participante a un candidato (por alias, tolerante a
// typos de nombre de pila y espacios). Ej: "Kyliam Mbappé", "Lionel messi ",
// "Lamin Yamal" -> el candidato correcto. Devuelve el nombre CANONICO
// normalizado del candidato, o null si no matchea a ninguno.
// Estrategia: el pick (normalizado) CONTIENE algun alias del candidato (los
// alias incluyen el apellido corto, que sobrevive a los typos del nombre).
export function resolverCandidato(
  pick: string | null | undefined,
  candidatos: Candidato[]
): string | null {
  const p = norm(pick);
  if (!p) return null;
  for (const c of candidatos) {
    for (const a of c.alias) {
      const an = norm(a);
      if (an && (p === an || p.includes(an) || an.includes(p))) {
        return norm(c.nombre);
      }
    }
  }
  return null;
}

// Compara dos nombres de persona (tolerante a typos/espacios/acentos). Se usa
// para saber si el pick de un participante coincide con un ganador YA confirmado.
export function mismaPersona(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function ganaA(fa: number, fb: number): boolean {
  return Math.random() < fa / (fa + fb);
}

// Fuerza efectiva de un equipo: primero el override (BD/admin), si no el default.
function fuerzaEff(equipo: string, fuerzas?: Record<string, number>): number {
  const n = norm(equipo);
  if (fuerzas && fuerzas[n] != null) return fuerzas[n];
  return fuerzaDe(equipo);
}

// Resuelve un cruce simulandolo por fuerza. Devuelve [ganador, perdedor].
function resolverCruce(
  local: string,
  visita: string,
  fuerzas: Record<string, number> | undefined
): [string, string] {
  return ganaA(fuerzaEff(local, fuerzas), fuerzaEff(visita, fuerzas))
    ? [local, visita]
    : [visita, local];
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
// Usa el resultado REAL de cada llave si ya se jugo; si no, lo simula por fuerza.
function simularBracket(
  bracket: PartidoBracket[],
  fuerzas?: Record<string, number>
): Map<string, number> {
  const slot = (s: string) => bracket.find((b) => b.slot === s);
  const sf1 = slot("P101");
  const sf2 = slot("P102");
  const fin = slot("P104");
  const ter = slot("P103");

  // Semis: ganador a la final, perdedor al 3er puesto.
  const [g1, p1] = sf1
    ? sf1.jugado
      ? [sf1.ganador!, sf1.perdedor!]
      : resolverCruce(sf1.local, sf1.visita, fuerzas)
    : ["", ""];
  const [g2, p2] = sf2
    ? sf2.jugado
      ? [sf2.ganador!, sf2.perdedor!]
      : resolverCruce(sf2.local, sf2.visita, fuerzas)
    : ["", ""];

  // Final: real si existe, si no simula ganador SF1 vs ganador SF2.
  const [campeon, sub] =
    fin && fin.jugado ? [fin.ganador!, fin.perdedor!] : resolverCruce(g1, g2, fuerzas);

  // 3er puesto: real si existe, si no simula perdedor SF1 vs perdedor SF2.
  const [tercero, cuarto] =
    ter && ter.jugado ? [ter.ganador!, ter.perdedor!] : resolverCruce(p1, p2, fuerzas);

  const tiers = new Map<string, number>();
  if (campeon) tiers.set(norm(campeon), PTS_CAMPEON);
  if (sub) tiers.set(norm(sub), PTS_FINALISTA);
  if (tercero) tiers.set(norm(tercero), PTS_TERCERO);
  if (cuarto) tiers.set(norm(cuarto), PTS_SEMI);
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

// Simula los partidos FUTUROS de un jugador segun su tendencia historica.
// Devuelve los puntos ganados + cuantos cayeron en cada categoria (para el
// desempate dinamico). Cada partido se sortea independiente por las tasas.
function simularFuturos(
  t: Tendencia,
  n: number
): { puntos: number; exactos: number; aciertos: number; fallasSin: number } {
  let puntos = 0;
  let exactos = 0;
  let aciertos = 0;
  let fallasSin = 0;
  for (let k = 0; k < n; k++) {
    const r = Math.random();
    let acc = t.exacto;
    if (r < acc) {
      puntos += PTS_EXACTO;
      exactos++;
      continue;
    }
    acc += t.diferencia;
    if (r < acc) {
      puntos += PTS_DIFERENCIA;
      aciertos++; // una diferencia tambien acerta el signo (cuenta como acierto)
      continue;
    }
    acc += t.acierto;
    if (r < acc) {
      puntos += PTS_ACIERTO;
      aciertos++;
      continue;
    }
    // falla o sin-pronostico: 0 puntos, penaliza el desempate.
    fallasSin++;
  }
  return { puntos, exactos, aciertos, fallasSin };
}

// ----- Simulacion completa -------------------------------------------------
export function simularQuiniela(entrada: EntradaSim): SalidaSim {
  const N = entrada.iteraciones ?? 10000;
  const NF = entrada.partidosFuturos ?? 4; // partidos que faltan
  const P = entrada.participantes;
  const wins = new Map<string, number>();
  for (const p of P) wins.set(p.id, 0);

  // Contador de ganadores por premio (para reportar prob computada).
  const premioWins: Record<string, Map<string, number>> = {};
  for (const pr of PREMIOS) premioWins[pr.key] = new Map();

  // PREMIOS efectivos: si el admin edito las cuotas, sobreescribimos la prob de
  // cada candidato (config guarda PORCENTAJE 0..100 -> aca a fraccion 0..1).
  const premiosEff: Premio[] = PREMIOS.map((pr) => ({
    ...pr,
    candidatos: pr.candidatos.map((c) => {
      const pct = entrada.cuotas?.[pr.key]?.[norm(c.nombre)];
      return pct != null ? { ...c, prob: pct / 100 } : c;
    }),
  }));

  // Pre-RESOLVEMOS los picks de premio a su candidato canonico (tolerante a
  // typos/espacios). Si no matchea a ningun candidato, queda null -> no puntua.
  const picksResueltos = P.map((p) => {
    const m: Partial<Record<Premio["campo"], string | null>> = {};
    for (const pr of PREMIOS) m[pr.campo] = resolverCandidato(p.picksPremio[pr.campo], pr.candidatos);
    return m as Record<Premio["campo"], string | null>;
  });

  for (let it = 0; it < N; it++) {
    const tiers = simularBracket(entrada.bracket, entrada.fuerzas);

    // Sortea ganador de cada premio (o lo FIJA si ya esta confirmado).
    const ganadores: Record<string, string | null> = {};
    for (const pr of premiosEff) {
      const conf = entrada.confirmados?.[pr.key];
      const g = conf && conf.trim() ? norm(conf) : sortearPremio(pr);
      ganadores[pr.key] = g;
      if (g) premioWins[pr.key].set(g, (premioWins[pr.key].get(g) ?? 0) + 1);
    }

    // Puntaje final de cada participante + clave de desempate.
    let mejor = -Infinity;
    let mejores: number[] = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      // Partidos futuros por tendencia (upside real de los que estan atras).
      const fut = simularFuturos(p.tendencia, NF);
      let total = p.baseEstable + fut.puntos + puntosPais(p.picksPais, tiers);
      for (const pr of PREMIOS) {
        const conf = entrada.confirmados?.[pr.key];
        if (conf && conf.trim()) {
          // Premio confirmado: suma fijo a quien lo acerto (match tolerante).
          if (mismaPersona(p.picksPremio[pr.campo], conf)) total += pr.pts;
        } else {
          const g = ganadores[pr.key];
          if (g && picksResueltos[i][pr.campo] === g) total += pr.pts;
        }
      }
      // Desempate: puntos desc, exactos desc, aciertos desc, (fallas+sin) asc.
      // Los conteos incluyen los partidos futuros simulados (dinamico).
      const score =
        total * 1e12 +
        (p.exactos + fut.exactos) * 1e9 +
        (p.aciertos + fut.aciertos) * 1e6 -
        (p.fallas + p.sinPron + fut.fallasSin) * 1e3;
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
