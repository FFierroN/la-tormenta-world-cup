import type { ReactNode } from "react";

// Boton uniforme del panel "Mi cuenta": icono dorado a la izquierda, etiqueta,
// y un slot opcional a la derecha (chevron del acordeon o cuenta regresiva).
// Todos comparten el look del boton de especiales; el pulso (glow) es opcional
// y se reserva para el de predicciones especiales.
export default function BotonCuenta({
  icon,
  children,
  onClick,
  right,
  glow = false,
  expandido,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  right?: ReactNode;
  glow?: boolean;
  expandido?: boolean; // si es cabecera de acordeon, marca aria-expanded
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={expandido}
      className={`${glow ? "glow-oro " : ""}w-full flex items-center gap-3 bg-carbon-card border-2 border-oro rounded-2xl px-4 py-3 text-oro font-semibold active:bg-carbon-soft ${className}`}
    >
      <span className="shrink-0 text-oro">{icon}</span>
      <span className="flex-1 text-left">{children}</span>
      {right && <span className="shrink-0 text-oro">{right}</span>}
    </button>
  );
}
