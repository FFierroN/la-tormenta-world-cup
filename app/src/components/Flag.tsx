import { useState } from "react";

type Props = { code: string; size?: number; nombre?: string };

// Codigos que no son banderas reales (equipos "Por definir").
const INVALIDOS = new Set(["", "xx"]);

// Bandera circular via flagcdn (gratis). code = ISO-3166 alpha-2 (ej "ar", "cl").
// Si el codigo no es valido o la imagen falla, muestra un balon.
export default function Flag({ code, size = 56, nombre }: Props) {
  const c = (code || "").toLowerCase();
  const [fallo, setFallo] = useState(false);
  const usarBalon = INVALIDOS.has(c) || fallo;

  if (usarBalon) {
    return (
      <div
        className="rounded-full bg-carbon-card ring-1 ring-borde flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-label={nombre ?? "Por definir"}
        title={nombre ?? "Por definir"}
      >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
          <path
            d="M12 7l2.6 1.9-1 3h-3.2l-1-3L12 7zM6.2 11.2l2.4.4M17.8 11.2l-2.4.4M9.4 16.5l-1 2M14.6 16.5l1 2"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w160/${c}.png`}
      alt={nombre ?? c}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFallo(true)}
      className="rounded-full object-cover bg-carbon-card ring-1 ring-borde"
      style={{ width: size, height: size }}
    />
  );
}
