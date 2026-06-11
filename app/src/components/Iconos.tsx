// Iconos de eventos de partido. Fuente unica (DRY): los usan el detalle del
// partido y el panel de admin. El tamano se controla con la prop className.
import type { TipoEvento } from "../lib/types";

export function BallIcon({ className = "w-4 h-4 text-neutral-200" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l3 2.2-1.2 3.6h-3.6L9 9.2 12 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Bota / zapato de futbol: marca quien dio la asistencia.
export function ShoeIcon({ className = "w-3.5 h-3.5 text-emerald-400" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-label="Asistencia">
      <path d="M2 15.5c0-.8.6-1.4 1.4-1.4h1.1l1.2-3.3c.3-.9 1.2-1.5 2.1-1.4l2.5.2c.6 0 1.1.3 1.5.8l2.3 3 6.2 1.8c.9.3 1.5 1.1 1.5 2v.9c0 .7-.6 1.3-1.3 1.3H3.6c-.9 0-1.6-.7-1.6-1.6v-1.3z" />
    </svg>
  );
}

export function YellowCard() {
  return <span className="inline-block w-3 h-4 rounded-sm bg-yellow-400" aria-label="Tarjeta amarilla" />;
}

export function RedCard() {
  return <span className="inline-block w-3 h-4 rounded-sm bg-red-600" aria-label="Tarjeta roja" />;
}

// Icono segun el tipo de evento (gol / amarilla / roja).
export function EventoIcono({ tipo }: { tipo: TipoEvento }) {
  if (tipo === "gol") return <BallIcon />;
  if (tipo === "amarilla") return <YellowCard />;
  return <RedCard />;
}
