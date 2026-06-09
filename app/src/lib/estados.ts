// Etiquetas y helpers de estado de partido. Fuente unica (DRY): lo usan
// tanto la lista de Partidos como el detalle del partido.
import type { EstadoPartido } from "./types";

export const ESTADO_LABEL: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_vivo: "En vivo",
  entretiempo: "Entretiempo",
  alargue: "Tiempo extra",
  penales: "Penales",
  final: "Final",
  suspendido: "Suspendido",
};

// Estados en los que el partido esta "rodando" (para el punto rojo / minuto).
export const ESTADOS_EN_CURSO: EstadoPartido[] = ["en_vivo", "alargue", "penales"];

export function enCurso(estado: EstadoPartido): boolean {
  return ESTADOS_EN_CURSO.includes(estado);
}
