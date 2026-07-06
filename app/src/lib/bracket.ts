// =====================================================================
// bracket.ts  ·  Helpers del CUADRO de eliminacion (pestana "Llaves").
// =====================================================================
// Construye la vista del cuadro a partir de los partidos REALES de
// Supabase (los 32 de eliminatoria, con slot/origen cargados por
// db/CARGA-TEMPLATE-LLAVES.sql). Mientras un equipo no este definido,
// se muestra el placeholder derivado del 'origen' (1A, 3C/D/F/G/H,
// "Gan. P73", etc). DRY: una sola fuente para la UI.
import type { Partido } from "./types";
import { ganadorPartido } from "./estados";

export type FaseLlave =
  | "Dieciseisavos"
  | "Octavos"
  | "Cuartos"
  | "Semifinales"
  | "Tercer Puesto"
  | "Final";

// Un cruce del cuadro listo para pintar. 'local'/'visita' son el texto a
// mostrar cuando NO hay equipo real (placeholder); equipoLocal/paisLocal
// se llenan cuando el equipo ya quedo definido por resultados.
export interface SlotLlave {
  id: string; // id real del partido (para navegar a /partido/:id)
  slot: string;
  fase: FaseLlave;
  fecha: string;
  ciudad?: string;
  local: string;
  visita: string;
  localCorto: string; // version compacta para el cuadro (G74 / P101 / 1A)
  visitaCorto: string;
  equipoLocal: string | null;
  paisLocal: string | null;
  equipoVisita: string | null;
  paisVisita: string | null;
  ganador: "local" | "visita" | null; // lado que gano (partido final); null si no jugado/empate
}

// Orden canonico de las fases (de la mas temprana a la final).
export const ORDEN_FASE_LLAVE: FaseLlave[] = [
  "Dieciseisavos",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer Puesto",
  "Final",
];

// Convierte un 'origen' guardado en DB al texto compacto que pidio Felipe:
//   '1A'      -> "1A"          (ganador grupo A)
//   '2B'      -> "2B"          (segundo grupo B)
//   '3CDFGH'  -> "3C/D/F/G/H"  (mejor tercero de esos grupos)
//   'GP73'    -> "Gan. P73"    (ganador del partido P73)
//   'PP101'   -> "Perd. P101"  (perdedor del P101)
export function placeholderDeOrigen(origen: string | null | undefined): string {
  if (!origen) return "Por definir";
  if (origen.startsWith("GP")) return `Gan. ${origen.slice(1)}`;
  if (origen.startsWith("PP")) return `Perd. ${origen.slice(1)}`;
  const tipo = origen[0];
  if (tipo === "3") return `3${origen.slice(1).split("").join("/")}`;
  return origen; // '1A' / '2B' tal cual
}

// Version COMPACTA para las tarjetas del cuadro (estilo 365scores):
//   'GP74'    -> "G74"   (ganador del partido 74)
//   'PP101'   -> "P101"  (perdedor del 101 -> juega 3er puesto)
//   '3CDFGH'  -> "3C/D/F/G/H"
//   '1A'/'2B' -> tal cual
export function placeholderCorto(origen: string | null | undefined): string {
  if (!origen) return "\u2014";
  if (origen.startsWith("GP")) return `G${origen.slice(2)}`;
  if (origen.startsWith("PP")) return `P${origen.slice(2)}`;
  const tipo = origen[0];
  if (tipo === "3") return `3${origen.slice(1).split("").join("/")}`;
  return origen;
}

const esDefinido = (nombre: string) => !!nombre && nombre !== "Por definir";

// Mapea un partido de eliminatoria a un SlotLlave para la UI.
export function partidoASlot(p: Partido): SlotLlave {
  return {
    id: p.id,
    slot: p.slot ?? p.id,
    fase: p.fase as FaseLlave,
    fecha: p.fecha,
    ciudad: p.ciudad ?? undefined,
    local: placeholderDeOrigen(p.origen_local),
    visita: placeholderDeOrigen(p.origen_visita),
    localCorto: placeholderCorto(p.origen_local),
    visitaCorto: placeholderCorto(p.origen_visita),
    equipoLocal: esDefinido(p.equipo_local) ? p.equipo_local : null,
    paisLocal: esDefinido(p.equipo_local) ? p.pais_local : null,
    equipoVisita: esDefinido(p.equipo_visita) ? p.equipo_visita : null,
    paisVisita: esDefinido(p.equipo_visita) ? p.pais_visita : null,
    ganador: ganadorPartido(p),
  };
}

// Indexa los slots por su codigo (P73..P104) para navegar el arbol.
export function indexarPorSlot(slots: SlotLlave[]): Record<string, SlotLlave> {
  const m: Record<string, SlotLlave> = {};
  for (const s of slots) m[s.slot] = s;
  return m;
}

// De la lista cruda de partidos saca SOLO los de eliminatoria (sin grupo)
// y los devuelve como SlotLlave.
export function construirLlaves(partidos: Partido[]): SlotLlave[] {
  return partidos.filter((p) => !p.grupo).map(partidoASlot);
}

// Orden de LLAVE (espejo del cuadro Fase Final) para los dieciseisavos. En vez
// de listarlos por fecha, siguen el FLUJO del bracket: agrupados por el octavo
// al que alimentan, de arriba hacia abajo (mismo orden visual que BracketFinal:
// octavos P89 P90 P93 P94 arriba | P91 P92 P95 P96 abajo). Cada octavo aporta
// sus dos alimentadores en orden [local, visita]:
//   P89=GP74,GP77 · P90=GP73,GP75 · P93=GP83,GP84 · P94=GP81,GP82
//   P91=GP76,GP78 · P92=GP79,GP80 · P95=GP86,GP88 · P96=GP85,GP87
export const ORDEN_LLAVE_DIECISEISAVOS: string[] = [
  "P74", "P77", // -> P89
  "P73", "P75", // -> P90
  "P83", "P84", // -> P93
  "P81", "P82", // -> P94
  "P76", "P78", // -> P91
  "P79", "P80", // -> P92
  "P86", "P88", // -> P95
  "P85", "P87", // -> P96
];

// Dieciseisavos ordenados por LLAVE (espejo del cuadro), no por fecha. Cualquier
// slot desconocido cae al final, desempatando por fecha para quedar estable.
export function dieciseisavosEnOrden(slots: SlotLlave[]): SlotLlave[] {
  const rank = new Map(ORDEN_LLAVE_DIECISEISAVOS.map((s, i) => [s, i] as const));
  return slots
    .filter((s) => s.fase === "Dieciseisavos")
    .sort((a, b) => {
      const ra = rank.get(a.slot) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.slot) ?? Number.MAX_SAFE_INTEGER;
      return ra !== rb ? ra - rb : a.fecha.localeCompare(b.fecha);
    });
}
