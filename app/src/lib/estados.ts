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

// Estilo del badge de estado que va arriba-derecha de la tarjeta / en el header.
//   mostrar=false  -> no se dibuja nada (caso 'programado': aun no se juega).
//   punto          -> clase de color del puntito (null = sin punto, ej. final).
//   glow           -> el punto pulsa con glow (en vivo / entretiempo / penales).
// El TEXTO siempre va en negrita y color neutro; el color vive en el punto.
export interface EstiloEstado {
  mostrar: boolean;
  punto: string | null;
  glow: boolean;
}

export function estiloEstado(estado: EstadoPartido): EstiloEstado {
  switch (estado) {
    case "programado":
      return { mostrar: false, punto: null, glow: false };
    case "en_vivo":
    case "alargue":
      return { mostrar: true, punto: "text-red-500", glow: true };
    case "entretiempo":
    case "penales":
      return { mostrar: true, punto: "text-yellow-400", glow: true };
    case "final":
      return { mostrar: false, punto: null, glow: false };
    default: // suspendido
      return { mostrar: true, punto: null, glow: false };
  }
}
