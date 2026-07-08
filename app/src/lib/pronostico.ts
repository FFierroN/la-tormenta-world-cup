// =====================================================================
// pronostico.ts  ·  Motor del SANDBOX "que pasaria si" (pestana Pronostico).
// =====================================================================
// Cuadro interactivo de Cuartos en adelante: el usuario elige el ganador de
// cada cruce y el arbol propaga a los elegidos hasta coronar un campeon.
// NO suma puntos ni toca resultados reales; es puro juego. Los picks se
// guardan en localStorage (por dispositivo). Lo unico que se sube a Supabase
// es el CAMPEON, para la cajita de "pais mas elegido por todos".
//
// La topologia se DERIVA de los 'origen' de cada partido (GP<x> = ganador del
// partido x, PP<x> = perdedor), asi que no hay estructura hardcodeada aparte.
import type { SlotLlave } from "./bracket";

export type Lado = "local" | "visita";

// Slots del sandbox (Cuartos -> Semis -> Final + 3er puesto).
export const SLOTS_CUARTOS = ["P97", "P98", "P99", "P100"] as const;
export const SLOTS_SEMIS = ["P101", "P102"] as const;
export const SLOT_FINAL = "P104";
export const SLOT_TERCERO = "P103";

// Todos los partidos que el usuario puede resolver (elige ganador).
export const SLOTS_SANDBOX: string[] = [
  ...SLOTS_CUARTOS,
  ...SLOTS_SEMIS,
  SLOT_TERCERO,
  SLOT_FINAL,
];

// picks: por cada partido, que LADO eligio el usuario como ganador.
export type Picks = Record<string, Lado>;

export interface EquipoResuelto {
  nombre: string;
  pais: string | null;
}

const codigoFuente = (origen: string): string => "P" + origen.slice(2); // 'GP97' -> 'P97'

// Resuelve el equipo que ocupa un lado de un partido, siguiendo los picks.
//   - Cuartos: entrada FIJA desde la BD (los 8 ya clasificados).
//   - Semis/Final: el lado sale del GANADOR (pick) de un partido anterior.
//   - 3er puesto: cada lado sale del PERDEDOR de una semifinal.
// Devuelve null si aun no se puede determinar (falta un pick aguas arriba).
export function resolverLado(
  slotCode: string,
  lado: Lado,
  ix: Record<string, SlotLlave>,
  picks: Picks
): EquipoResuelto | null {
  const s = ix[slotCode];
  if (!s) return null;

  if (s.fase === "Cuartos") {
    const nombre = lado === "local" ? s.equipoLocal : s.equipoVisita;
    const pais = lado === "local" ? s.paisLocal : s.paisVisita;
    return nombre ? { nombre, pais } : null;
  }

  const origen = lado === "local" ? s.origenLocal : s.origenVisita;
  if (!origen) return null;
  if (origen.startsWith("GP")) return ganadorResuelto(codigoFuente(origen), ix, picks);
  if (origen.startsWith("PP")) return perdedorResuelto(codigoFuente(origen), ix, picks);
  return null;
}

// El equipo que el usuario eligio como ganador de un partido (recursivo).
export function ganadorResuelto(
  slotCode: string,
  ix: Record<string, SlotLlave>,
  picks: Picks
): EquipoResuelto | null {
  const pick = picks[slotCode];
  if (!pick) return null;
  return resolverLado(slotCode, pick, ix, picks);
}

// El equipo que PERDIO (el lado no elegido) de un partido con pick hecho.
function perdedorResuelto(
  slotCode: string,
  ix: Record<string, SlotLlave>,
  picks: Picks
): EquipoResuelto | null {
  const pick = picks[slotCode];
  if (!pick) return null;
  const perdedor: Lado = pick === "local" ? "visita" : "local";
  return resolverLado(slotCode, perdedor, ix, picks);
}

// Reverso de la topologia: partido fuente -> partidos que dependen de el.
// Derivado de los 'origen' (DRY). Ej: P97 -> [P101]; P101 -> [P103, P104].
export function construirDependientes(
  ix: Record<string, SlotLlave>
): Record<string, string[]> {
  const dep: Record<string, string[]> = {};
  for (const code of [...SLOTS_SEMIS, SLOT_TERCERO, SLOT_FINAL]) {
    const s = ix[code];
    if (!s) continue;
    for (const origen of [s.origenLocal, s.origenVisita]) {
      if (origen && (origen.startsWith("GP") || origen.startsWith("PP"))) {
        const src = codigoFuente(origen);
        (dep[src] ??= []).push(code);
      }
    }
  }
  return dep;
}

// Aplica un pick y LIMPIA los picks aguas abajo (que ya no son validos porque
// su equipo pudo cambiar). Devuelve un objeto de picks nuevo (inmutable).
export function aplicarPick(
  picks: Picks,
  slotCambiado: string,
  lado: Lado,
  dep: Record<string, string[]>
): Picks {
  const nuevo: Picks = { ...picks, [slotCambiado]: lado };
  // BFS aguas abajo borrando picks dependientes.
  const cola = [...(dep[slotCambiado] ?? [])];
  while (cola.length) {
    const c = cola.shift()!;
    if (nuevo[c] !== undefined) delete nuevo[c];
    for (const d of dep[c] ?? []) cola.push(d);
  }
  return nuevo;
}

// Campeon actual del sandbox (ganador del partido Final), o null si incompleto.
export function campeonActual(
  ix: Record<string, SlotLlave>,
  picks: Picks
): EquipoResuelto | null {
  return ganadorResuelto(SLOT_FINAL, ix, picks);
}

// ------------------------------------------------------------ localStorage
const CLAVE_PICKS = "tormenta:pronostico:picks";

export function leerPicks(): Picks {
  try {
    const raw = localStorage.getItem(CLAVE_PICKS);
    return raw ? (JSON.parse(raw) as Picks) : {};
  } catch {
    return {};
  }
}

export function guardarPicks(picks: Picks): void {
  try {
    localStorage.setItem(CLAVE_PICKS, JSON.stringify(picks));
  } catch {
    /* almacenamiento lleno o deshabilitado: no es critico */
  }
}

export function limpiarPicks(): void {
  try {
    localStorage.removeItem(CLAVE_PICKS);
  } catch {
    /* idem */
  }
}
