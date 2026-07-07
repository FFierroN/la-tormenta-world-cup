// Fuente unica (DRY) para las 6 tablas de la pestana "Estadisticas". Aca vive
// el label, el icono, el sufijo y de que campo del objeto Estadisticas se
// saca cada tabla. Lo consumen:
//   - components/PanelEstadisticas.tsx  -> render del top 5 en Copa
//   - pages/EstadisticaDetalle.tsx      -> pantalla de lista completa
// Cambiar el orden aca cambia el orden en AMBOS lugares.
import type { ReactNode } from "react";
import type { Estadisticas, FilaGoleo } from "../lib/types";
import { BallIcon, ShoeIcon, YellowCard, RedCard, PenalIcon } from "./Iconos";

export interface TipoEstadistica {
  key: string; // slug para la URL: /copa/estadisticas/:key
  label: string;
  sufijo: string; // etiqueta corta a la derecha del numero (ej. "goles")
  icono: ReactNode;
  extraer: (d: Estadisticas) => FilaGoleo[];
}

// Icono combinado balon + botita para "Goles + Asistencias" (evita crear SVG
// nuevo; reusa los dos iconos existentes solapados).
function IconoGolAsist() {
  return (
    <span className="inline-flex items-center gap-1">
      <BallIcon className="w-4 h-4 text-white" />
      <span className="text-oro/60 text-xs font-bold">+</span>
      <ShoeIcon className="w-3.5 h-3.5 text-oro" />
    </span>
  );
}

// Orden pedido: Goleadores, Asistidores, Goles+Asist, Penales, Amarillas, Rojas.
export const TIPOS_ESTADISTICA: TipoEstadistica[] = [
  {
    key: "goleadores",
    label: "Goleadores",
    sufijo: "goles",
    icono: <BallIcon className="w-4 h-4 text-white" />,
    extraer: (d) => d.goleadores,
  },
  {
    key: "asistidores",
    label: "Asistidores",
    sufijo: "asist.",
    icono: <ShoeIcon className="w-4 h-4 text-oro" />,
    extraer: (d) => d.asistidores,
  },
  {
    key: "goles-asist",
    label: "Goles + Asistencias",
    sufijo: "g+a",
    icono: <IconoGolAsist />,
    extraer: (d) => d.golesYAsist,
  },
  {
    key: "penales",
    label: "Penales convertidos",
    sufijo: "penales",
    icono: <PenalIcon className="w-4 h-4" />,
    extraer: (d) => d.penales,
  },
  {
    key: "amarillas",
    label: "Tarjetas amarillas",
    sufijo: "amar.",
    icono: <YellowCard />,
    extraer: (d) => d.amarillas,
  },
  {
    key: "rojas",
    label: "Tarjetas rojas",
    sufijo: "rojas",
    icono: <RedCard />,
    extraer: (d) => d.rojas,
  },
];

// Lookup por key (URL). Devuelve null si no matchea (para 404-style handling).
export function tipoEstadisticaPorKey(key: string | undefined): TipoEstadistica | null {
  if (!key) return null;
  return TIPOS_ESTADISTICA.find((t) => t.key === key) ?? null;
}
