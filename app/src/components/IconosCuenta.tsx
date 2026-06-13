// Iconos del panel "Mi cuenta" (uno por boton). Trazo via currentColor para
// que el color lo ponga Tailwind (text-oro). Tamano via className.
import type { ReactNode } from "react";

type P = { className?: string };
const base = "w-5 h-5";

function Svg({ className = base, children }: P & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Alias: etiqueta / tag.
export function AliasIcon({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M3 7v4.6c0 .5.2 1 .6 1.4l7.4 7.4c.8.8 2 .8 2.8 0l4.6-4.6c.8-.8.8-2 0-2.8L11 5.6c-.4-.4-.9-.6-1.4-.6H5a2 2 0 0 0-2 2Z" />
      <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// Cambiar PIN: candado.
export function PinIcon({ className }: P) {
  return (
    <Svg className={className}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// Reglas: libro abierto.
export function ReglasIcon({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M12 6.5C10.5 5.3 8.5 4.8 5 5v12c3.5-.2 5.5.3 7 1.5 1.5-1.2 3.5-1.7 7-1.5V5c-3.5-.2-5.5.3-7 1.5Z" />
      <path d="M12 6.5v12" />
    </Svg>
  );
}

// Mis predicciones: ticket / lista marcada.
export function PrediccionesIcon({ className }: P) {
  return (
    <Svg className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9.5l1.6 1.6L12.5 8" />
      <path d="M15 10h2" />
      <path d="M8 15h8" />
    </Svg>
  );
}

// Especiales: estrella.
export function EstrellaIcon({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16.9 7.4 18.1l.9-5.1L4.5 9.5l5.2-.8L12 4Z" />
    </Svg>
  );
}

// Panel de admin: escudo.
export function AdminIcon({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M12 3l7 2.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5L12 3Z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// Chevron (acordeon). Rota con la prop abierto.
export function ChevronIcon({ className, abierto }: P & { abierto?: boolean }) {
  return (
    <svg
      className={`${className ?? "w-5 h-5"} transition-transform ${abierto ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
