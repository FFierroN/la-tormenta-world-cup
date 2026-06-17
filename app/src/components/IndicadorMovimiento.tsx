// Indicador de movimiento de posicion (verde sube / rojo baja / gris igual).
// Reutilizado en la tabla de jugadores, la tabla en vivo y los grupos de Copa.
// Sin emojis (el proyecto no los permite): chevron arriba/abajo y un circulo.
import { calcularMovimiento, type Movimiento } from "../lib/movimiento";

const ETIQUETA: Record<Movimiento, string> = {
  sube: "Sube posiciones",
  baja: "Baja posiciones",
  igual: "Sin cambios",
};

export default function IndicadorMovimiento({
  actual,
  anterior,
  className = "",
}: {
  actual: number | null | undefined;
  anterior: number | null | undefined;
  className?: string;
}) {
  const mov = calcularMovimiento(actual, anterior);
  return (
    <span
      role="img"
      aria-label={ETIQUETA[mov]}
      title={ETIQUETA[mov]}
      className={`inline-flex items-center justify-center w-4 h-4 ${className}`}
    >
      {mov === "sube" && (
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {mov === "baja" && (
        <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {mov === "igual" && (
        <svg className="w-2.5 h-2.5 text-neutral-500" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
    </span>
  );
}
