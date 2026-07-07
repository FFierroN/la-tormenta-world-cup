// Iconos de eventos de partido. Fuente unica (DRY): los usan el detalle del
// partido y el panel de admin. El tamano se controla con la prop className.
import type { TipoEvento } from "../lib/types";

// Balon de futbol (Tabler Icons "ball-football", outline). Reemplazo del
// balon geometrico anterior (2026-07-07): tiene el detalle del pentagono
// central + los rayos hacia los laterales, mucho mas reconocible como balon
// de futbol. Usa stroke=currentColor asi mantiene el coloring con Tailwind
// (text-white, text-oro, etc.).
export function BallIcon({ className = "w-4 h-4 text-neutral-200" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Gol"
    >
      {/* Circulo exterior del balon */}
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      {/* Pentagono central */}
      <path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45" />
      {/* 5 rayos que salen del pentagono hacia el borde */}
      <path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45" />
    </svg>
  );
}

// Botin de futbol: usa el PNG /iconos/botin.png que subio Felipe como MASCARA
// via CSS mask-image, con currentColor de fondo. Asi la imagen se ve identica
// al glyph original (silueta detallada de botin con cordones + costura + 5
// tapones) PERO el color viene de Tailwind (text-emerald-400 default, pero
// se puede sobreescribir con cualquier text-*, igual que un SVG con
// currentColor). Mejor de los dos mundos.
//
// Nota: el PNG es negro sobre transparente. mask-image toma la ALPHA del PNG
// para mostrar el bg-color (que es currentColor via bg-current). Los pixeles
// transparentes del PNG NO se pintan; los negros SI. Zero perdida de detalle.
export function ShoeIcon({ className = "w-3.5 h-3.5 text-emerald-400" }: { className?: string }) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMaskImage: "url(/iconos/botin.png)",
        maskImage: "url(/iconos/botin.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      role="img"
      aria-label="Asistencia"
    />
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

// Check (tilde): marca al equipo GANADOR arriba de su bandera en partidos
// jugados. Circulo relleno con el tilde recortado para que se vea nitido.
export function CheckIcon({ className = "w-4 h-4 text-neon-menta" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-label="Ganador">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.7a1 1 0 00-1.4-1.4l-4.8 4.8-2.1-2.1a1 1 0 10-1.4 1.4l2.8 2.8a1 1 0 001.4 0l5.5-5.5z"
      />
    </svg>
  );
}
