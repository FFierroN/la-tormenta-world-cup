// Panel de "Efectividad": % de los puntos POSIBLES que saco un participante,
// en los ultimos 10 partidos y desglosado por fase (16avos, octavos, cuartos...).
// Va dentro de la pestana Pronosticos (detalle del participante).
//
// El maximo de cada partido = el mayor total que saco cualquiera (data-driven),
// por eso necesita las predicciones de TODOS (prediccionesJugadasTodas).
import { useAsync } from "../lib/useAsync";
import { prediccionesJugadasTodas } from "../lib/data";
import { calcularEfectividad, etiquetaFase } from "../lib/efectividad";

export default function PanelEfectividad({ jugadorId }: { jugadorId: string | null }) {
  const { data, cargando, error } = useAsync(prediccionesJugadasTodas, []);
  if (!jugadorId || error) return null;
  if (cargando || !data) {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-borde bg-carbon-card p-3">
        <p className="text-neutral-400 text-sm">Calculando efectividad...</p>
      </div>
    );
  }

  const ef = calcularEfectividad(data, jugadorId, 10);
  if (ef.fases.length === 0) return null; // aun no hay partidos con puntos

  return (
    <div className="mx-4 mt-3 rounded-xl border border-borde bg-carbon-card p-3">
      <h3 className="text-sm font-bold text-oro mb-2">Efectividad</h3>

      {/* Ultimos N partidos: la fila destacada arriba. */}
      <FilaEfectividad
        titulo={`Ultimos ${ef.ultimos.n} partidos`}
        obtenidos={ef.ultimos.obtenidos}
        posible={ef.ultimos.posible}
        pct={ef.ultimos.pct}
        destacado
      />

      <div className="mt-2 pt-2 border-t border-borde flex flex-col gap-2">
        {ef.fases.map((f) => (
          <FilaEfectividad
            key={f.fase}
            titulo={etiquetaFase(f.fase)}
            obtenidos={f.obtenidos}
            posible={f.posible}
            pct={f.pct}
          />
        ))}
      </div>

      <p className="text-[10px] text-neutral-500 mt-2 leading-tight">
        Puntos que sacaste / puntos que daba cada partido (el maximo que logro
        cualquier participante). Los partidos sin pronostico cuentan como 0.
      </p>
    </div>
  );
}

function FilaEfectividad({
  titulo,
  obtenidos,
  posible,
  pct,
  destacado = false,
}: {
  titulo: string;
  obtenidos: number;
  posible: number;
  pct: number;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex-1 min-w-0 truncate ${destacado ? "text-sm font-semibold" : "text-xs"}`}>
        {titulo}
      </span>
      <span className="text-xs tabular-nums text-neutral-400">
        {obtenidos}/{posible}
      </span>
      <div className="w-20 h-2 bg-carbon-soft rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`w-11 text-right tabular-nums font-bold ${destacado ? "text-emerald-400" : "text-emerald-400/90 text-sm"}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
