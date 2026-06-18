// Tabla de posiciones PROVISIONAL (en vivo) para la pestana Tormenta del
// detalle de partido. Muestra como quedaria la tabla de la liga sumando los
// partidos EN CURSO. Al finalizar, esos puntos pasan a la tabla oficial (pestana
// Tabla), asi que esta vista converge sola.
//
// Cada fila lleva el indicador de movimiento (verde sube / rojo baja / gris
// igual) comparando la posicion EN VIVO contra el CIERRE DE LA JORNADA ANTERIOR.
import IndicadorMovimiento from "./IndicadorMovimiento";
import { obtenerTablaLive, obtenerPosicionesBase } from "../lib/data";
import { useAsync } from "../lib/useAsync";

export default function TablaTormentaLive() {
  const { data: live, cargando, error } = useAsync(obtenerTablaLive, []);
  const { data: posBase } = useAsync(obtenerPosicionesBase, []);

  if (cargando) {
    return <div className="text-center text-neutral-400 py-10">Cargando...</div>;
  }
  if (error || !live) {
    return (
      <div className="text-center text-neutral-400 py-10">
        No se pudo cargar la tabla en vivo.
      </div>
    );
  }

  // Posicion BASE por jugador (cierre de la jornada anterior) para el indicador.
  const posBaseMap = posBase ?? new Map<string, number>();

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-borde">
        <div className="text-sm font-semibold text-center">Tabla en vivo</div>
        <p className="mt-1 text-[11px] text-neutral-400 text-center leading-snug">
          Posiciones provisionales sumando los partidos en curso. Al finalizar,
          los puntos pasan a la tabla oficial.
        </p>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-carbon-soft text-neutral-400 text-xs uppercase">
          <tr>
            <th className="py-2.5 px-2 text-left w-6">#</th>
            <th className="py-2.5 px-1 w-5" aria-label="Movimiento" />
            <th className="py-2.5 px-2 text-left">Jugador</th>
            <th className="py-2.5 px-1 text-center">Pts</th>
            <th className="py-2.5 px-1 text-center" title="Exactos">Ex</th>
            <th className="py-2.5 px-1 text-center" title="Aciertos">Ac</th>
            <th className="py-2.5 px-1 text-center" title="Fallas">Fa</th>
          </tr>
        </thead>
        <tbody>
          {live.map((f) => (
            <tr key={f.jugador_id} className="border-t border-borde">
              <td className="py-2.5 px-2 font-bold text-oro tabular-nums">
                {f.posicion}
              </td>
              <td className="py-2.5 px-1 text-center">
                <IndicadorMovimiento
                  actual={f.posicion}
                  anterior={posBaseMap.get(f.jugador_id) ?? f.posicion}
                />
              </td>
              <td className="py-2.5 px-2">{f.alias ?? f.nombre}</td>
              <td className="py-2.5 px-1 text-center font-bold tabular-nums">
                {f.puntos}
              </td>
              <td className="py-2.5 px-1 text-center tabular-nums">{f.exactos}</td>
              <td className="py-2.5 px-1 text-center tabular-nums">{f.aciertos}</td>
              <td className="py-2.5 px-1 text-center tabular-nums">{f.fallas}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Leyenda del indicador */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-3 border-t border-borde text-[11px] text-neutral-300">
        <span className="flex items-center gap-1.5">
          <IndicadorMovimiento actual={1} anterior={2} /> Sube
        </span>
        <span className="flex items-center gap-1.5">
          <IndicadorMovimiento actual={2} anterior={1} /> Baja
        </span>
        <span className="flex items-center gap-1.5">
          <IndicadorMovimiento actual={1} anterior={1} /> Igual
        </span>
      </div>
    </div>
  );
}
