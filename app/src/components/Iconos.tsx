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

// Sustitucion: flecha verde (entra) + flecha roja (sale).
export function SubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Cambio">
      {/* entra (sube) */}
      <path d="M7 21V7m0 0l-3 3m3-3l3 3" stroke="#34d399" />
      {/* sale (baja) */}
      <path d="M17 3v14m0 0l3-3m-3 3l-3-3" stroke="#f87171" />
    </svg>
  );
}

// Flecha simple ENTRA (verde, hacia arriba). Marca al suplente que entro.
export function FlechaEntra({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="Entro">
      <path d="M12 19V5m0 0l-6 6m6-6l6 6" />
    </svg>
  );
}

// Flecha simple SALE (roja, hacia abajo). Marca al titular que salio.
export function FlechaSale({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="Salio">
      <path d="M12 5v14m0 0l6-6m-6 6l-6-6" />
    </svg>
  );
}

// Cambio APILADO (vertical): flecha verde arriba (entra) + roja abajo (sale).
// Usado en el timeline rediseñado del detalle (estilo OneFootball).
export function FlechasCambio({ className = "w-4" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} aria-label="Cambio">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5m0 0l-5 5m5-5l5 5" />
      </svg>
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14m0 0l5-5m-5 5l-5-5" />
      </svg>
    </span>
  );
}

// Penal convertido: badge "P" amarillo con check verde (esquina).
export function PenalIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full bg-yellow-400 text-black text-[11px] font-black ${className}`}
      aria-label="Gol de penal"
    >
      P
      <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
        <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    </span>
  );
}

// Penal de TANDA: balon con badge en esquina -> convertido (check verde) o
// fallado/atajado (X roja). Estilo 365 Scores.
export function PenalTandaIcon({
  convertido,
  className = "w-5 h-5",
}: {
  convertido: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      aria-label={convertido ? "Penal convertido" : "Penal fallado"}
    >
      <BallIcon className="w-5 h-5 text-white" />
      <span
        className={`absolute -bottom-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full ${
          convertido ? "bg-emerald-500" : "bg-rose-600"
        }`}
      >
        {convertido ? (
          <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        )}
      </span>
    </span>
  );
}

// Porteria con balon: usado para el AUTOGOL (gol en contra) en el timeline.
export function PorteriaIcon({ className = "w-5 h-5 text-rose-400" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label="Autogol">
      <rect x="3" y="5" width="18" height="11" rx="1" strokeWidth="1.6" />
      <path d="M8 5v11M13 5v11M18 5v11M3 9h18M3 13h18" strokeWidth="0.7" />
      <circle cx="12" cy="20" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Icono segun el tipo de evento (gol / amarilla / roja / cambio).
export function EventoIcono({ tipo }: { tipo: TipoEvento }) {
  if (tipo === "gol") return <BallIcon />;
  if (tipo === "amarilla") return <YellowCard />;
  if (tipo === "cambio") return <SubIcon />;
  return <RedCard />;
}
