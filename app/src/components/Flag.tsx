import { useState } from "react";

type Props = { code: string; size?: number; nombre?: string };

// Codigos que no son banderas reales (equipos "Por definir").
const INVALIDOS = new Set(["", "xx"]);

// Bandera circular via flagcdn (gratis). code = ISO-3166 alpha-2 (ej "ar", "cl").
// Si el codigo no es valido o la imagen falla, muestra el logo (Por definir).
export default function Flag({ code, size = 56, nombre }: Props) {
  const c = (code || "").toLowerCase();
  const [fallo, setFallo] = useState(false);
  const usarLogo = INVALIDOS.has(c) || fallo;

  if (usarLogo) {
    return (
      <img
        src="/logo.png"
        alt={nombre ?? "Por definir"}
        title={nombre ?? "Por definir"}
        width={size}
        height={size}
        className="rounded-full object-cover bg-carbon-card ring-1 ring-borde"
        style={{ width: size, height: size }}
      />
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
