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

// Partes del nombre (sin acentos), conservando las iniciales sueltas ("a.").
function partes(nombre: string | null): string[] {
  return (nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[.\-']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// True si los dos nombres son (muy probablemente) el mismo jugador.
// 1) Apellido: comparamos los ultimos tokens "largos" (descarta iniciales).
// 2) Desempate por INICIAL del primer nombre: si un lado viene como
//    "N. Apellido", la inicial debe coincidir con la del otro lado. Esto evita
//    confundir hermanos/apellidos repetidos (ej. los muchos "Al-..." de Arabia).
export function mismoJugador(a: string | null, b: string | null): boolean {
  const pa = partes(a);
  const pb = partes(b);
  if (!pa.length || !pb.length) return false;

  const sa = pa.filter((t) => t.length > 1);
  const sb = pb.filter((t) => t.length > 1);
  if (!sa.length || !sb.length) return false;
  const n = Math.min(sa.length, sb.length);
  for (let i = 1; i <= n; i++) {
    if (sa[sa.length - i] !== sb[sb.length - i]) return false;
  }

  // Inicial del primer nombre (solo cuando un lado la trae como "X.").
  const inicA = pa[0].length === 1 ? pa[0] : null;
  const inicB = pb[0].length === 1 ? pb[0] : null;
  if (inicA && pb[0][0] !== inicA) return false;
  if (inicB && pa[0][0] !== inicB) return false;
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
      // OJO: en los datos guardados de Highlightly, 'jugador' = quien SALE y
      // 'asistencia' = quien ENTRA (al reves de lo intuitivo). Por eso van
      // cruzados aca: el que matchea 'jugador' salio; el que matchea
      // 'asistencia' entro.
      if (esEl) a.salio = true; // jugador del evento = quien salio
      if (mismoJugador(nombre, e.asistencia)) a.entro = true; // asistencia = quien entro
    }
  }
  return a;
}
