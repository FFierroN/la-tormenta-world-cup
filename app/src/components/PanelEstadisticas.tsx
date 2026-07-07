// Pestana "Estadisticas" dentro de Copa. Muestra 6 rankings del torneo,
// todos sacados de partido_eventos (una sola query, agregado en cliente).
// Colapsados: top 5 cada uno. Click al pie de una tabla -> lista completa.
import ListaGoleo from "./ListaGoleo";
import type { ReactNode } from "react";
import {
  BallIcon,
  ShoeIcon,
  YellowCard,
  RedCard,
  PenalIcon,
} from "./Iconos";
import { obtenerEstadisticas } from "../lib/data";
import { useAsync } from "../lib/useAsync";

export default function PanelEstadisticas() {
  const { data, cargando, error } = useAsync(obtenerEstadisticas, []);

  if (cargando) {
    return (
      <div className="px-4 py-4">
        <p className="text-neutral-400 text-sm">Cargando estadisticas...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-4">
        <p className="text-red-400 text-sm">
          No se pudieron cargar las estadisticas. Revisa la conexion con
          Supabase.
        </p>
      </div>
    );
  }
  if (!data) return null;

  const hayAlgo =
    data.goleadores.length +
      data.asistidores.length +
      data.golesYAsist.length +
      data.amarillas.length +
      data.rojas.length +
      data.penales.length >
    0;

  if (!hayAlgo) {
    return (
      <div className="px-4 py-4">
        <p className="text-neutral-400 text-sm">
          Aun no hay eventos registrados en el torneo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 pb-2">
      <ListaGoleo
        titulo="Goleadores"
        filas={data.goleadores}
        icono={<BallIcon className="w-4 h-4 text-white" />}
        sufijo="goles"
      />
      <ListaGoleo
        titulo="Asistidores"
        filas={data.asistidores}
        icono={<ShoeIcon className="w-4 h-4 text-emerald-400" />}
        sufijo="asist."
      />
      <ListaGoleo
        titulo="Goles + Asistencias"
        filas={data.golesYAsist}
        icono={<IconoGolAsist />}
        sufijo="g+a"
      />
      <ListaGoleo
        titulo="Tarjetas amarillas"
        filas={data.amarillas}
        icono={<YellowCard />}
        sufijo="amar."
      />
      <ListaGoleo
        titulo="Tarjetas rojas"
        filas={data.rojas}
        icono={<RedCard />}
        sufijo="rojas"
      />
      <ListaGoleo
        titulo="Penales convertidos"
        filas={data.penales}
        icono={<PenalIcon className="w-4 h-4" />}
        sufijo="penales"
      />
    </div>
  );
}

// Icono combinado balon + botita para "Goles + Asistencias" (evita crear un
// SVG nuevo; se reusan los dos iconos existentes solapaditos, DRY).
function IconoGolAsist(): ReactNode {
  return (
    <span className="inline-flex items-center gap-1">
      <BallIcon className="w-4 h-4 text-white" />
      <span className="text-oro/60 text-xs font-bold">+</span>
      <ShoeIcon className="w-3.5 h-3.5 text-emerald-400" />
    </span>
  );
}
