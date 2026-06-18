// Cruza los eventos de un partido con los jugadores de la alineacion para saber
// que actividad tuvo cada uno (goles, asistencias, tarjetas, entro/salio).
// Reto: los nombres difieren entre fuentes -> "A. Al Amri" (evento) vs
// "Abdulelah Al-Amri" (alineacion). Hacemos match por los ultimos tokens.
import type { EventoPartido } from "./types";

export interface ActividadJugador {
  goles: number;
  autogoles: number;
  asistencias: number;
  amarilla: boolean;
  roja: boolean;
  entro: boolean; // suplente que entro
  salio: boolean; // titular que salio
}

const VACIA: ActividadJugador = {
  goles: 0, autogoles: 0, asistencias: 0,
  amarilla: false, roja: false, entro: false, salio: false,
};

// Tokens significativos del nombre (sin acentos, sin iniciales sueltas).
function tokens(nombre: string | null): string[] {
  return (nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[.\-']/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1); // descarta "a." y vacios
}

// True si los dos nombres son (muy probablemente) el mismo jugador: comparamos
// los ultimos N tokens (N = el del nombre mas corto). Ej: ["al","amri"] vs
// ["abdulelah","al","amri"] -> compara amri==amri y al==al.
export function mismoJugador(a: string | null, b: string | null): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const n = Math.min(ta.length, tb.length);
  for (let i = 1; i <= n; i++) {
    if (ta[ta.length - i] !== tb[tb.length - i]) return false;
  }
  return true;
}

// Calcula la actividad de un jugador a partir de los eventos de SU equipo.
export function actividadDe(
  nombre: string,
  eventosEquipo: EventoPartido[]
): ActividadJugador {
  const a: ActividadJugador = { ...VACIA };
  for (const e of eventosEquipo) {
    const esEl = mismoJugador(nombre, e.jugador);
    // En cambios: jugador=entra, asistencia=sale. En goles: asistencia=asistio.
    if (e.tipo === "gol") {
      if (esEl) {
        if (e.detalle === "autogol") a.autogoles += 1;
        else a.goles += 1;
      }
      if (mismoJugador(nombre, e.asistencia)) a.asistencias += 1;
    } else if (e.tipo === "amarilla") {
      if (esEl) a.amarilla = true;
    } else if (e.tipo === "roja") {
      if (esEl) a.roja = true;
    } else if (e.tipo === "cambio") {
      if (esEl) a.entro = true; // este jugador es quien entro
      if (mismoJugador(nombre, e.asistencia)) a.salio = true; // este salio
    }
  }
  return a;
}
