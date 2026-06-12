import type { EstadisticasPartido, Partido } from "../lib/types";

// Metricas que mostramos, en orden, con su etiqueta en espanol y formato.
// 'key' es el displayName crudo de Highlightly. Si una no viene, se omite.
type Fmt = "pct" | "dec" | "int";
const METRICAS: { key: string; label: string; fmt: Fmt }[] = [
  { key: "Possession", label: "Posesion", fmt: "pct" },
  { key: "Expected Goals", label: "Goles esperados (xG)", fmt: "dec" },
  { key: "Shots on target", label: "Tiros al arco", fmt: "int" },
  { key: "Shots off target", label: "Tiros afuera", fmt: "int" },
  { key: "Blocked shots", label: "Tiros bloqueados", fmt: "int" },
  { key: "Shots within penalty area", label: "Tiros en el area", fmt: "int" },
  { key: "Corners", label: "Tiros de esquina", fmt: "int" },
  { key: "Offsides", label: "Fueras de juego", fmt: "int" },
  { key: "Fouls", label: "Faltas", fmt: "int" },
  { key: "Yellow cards", label: "Amarillas", fmt: "int" },
  { key: "Red cards", label: "Rojas", fmt: "int" },
  { key: "Total passes", label: "Pases totales", fmt: "int" },
  { key: "Successful passes", label: "Pases completados", fmt: "int" },
  { key: "Key Passes", label: "Pases clave", fmt: "int" },
  { key: "Goalkeeper saves", label: "Atajadas", fmt: "int" },
  { key: "Expected Assists", label: "Asistencias esperadas (xA)", fmt: "dec" },
];

function fmtValor(v: number | null | undefined, fmt: Fmt): string {
  if (v == null) return "-";
  if (fmt === "pct") return `${Math.round(v * 100)}%`;
  if (fmt === "dec") return v.toFixed(2);
  return String(Math.round(v));
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

// Valor de una stat. El mayor de la fila va en recuadro de borde verde.
// El no-destacado lleva borde transparente para que ambos midan igual.
function Valor({
  v,
  fmt,
  destacado,
}: {
  v: number | null | undefined;
  fmt: Fmt;
  destacado: boolean;
}) {
  return (
    <span
      className={`tabular-nums font-bold text-sm px-2 py-0.5 rounded-lg border ${
        destacado
          ? "bg-green-500/20 text-green-400 border-transparent"
          : "text-white border-transparent"
      }`}
    >
      {fmtValor(v, fmt)}
    </span>
  );
}

export default function PanelStats({ partido }: { partido: Partido }) {
  const est: EstadisticasPartido | null = partido.estadisticas;

  if (!est || !est.local || !est.visita) {
    return (
      <div className="text-center text-neutral-400 py-10">
        Las estadisticas se cargan cuando termina el partido.
      </div>
    );
  }

  const filas = METRICAS.filter(
    (m) => est.local[m.key] != null || est.visita[m.key] != null
  );

  if (filas.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-10">
        No hay estadisticas para este partido.
      </div>
    );
  }

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
      {/* Cabecera: que lado es cada equipo */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-borde text-xs font-semibold">
        <span className="text-neutral-300 truncate max-w-[40%]">{partido.equipo_local}</span>
        <span className="text-neutral-400">Estadisticas</span>
        <span className="text-neutral-300 truncate max-w-[40%] text-right">
          {partido.equipo_visita}
        </span>
      </div>

      <ul className="px-4 py-2">
        {filas.map((m) => {
          const l = est.local[m.key];
          const v = est.visita[m.key];
          // El valor mayor (de cualquier equipo) se destaca con borde verde.
          const mejor: "local" | "visita" | null =
            num(l) > num(v) ? "local" : num(v) > num(l) ? "visita" : null;
          return (
            <li
              key={m.key}
              className="flex items-center justify-between gap-2 py-2.5"
            >
              <div className="w-16 flex justify-start">
                <Valor v={l} fmt={m.fmt} destacado={mejor === "local"} />
              </div>
              <span className="flex-1 text-center text-sm font-bold text-white">
                {m.label}
              </span>
              <div className="w-16 flex justify-end">
                <Valor v={v} fmt={m.fmt} destacado={mejor === "visita"} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
