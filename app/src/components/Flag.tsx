import { useState } from "react";

type Props = {
  code: string;
  size?: number;
  nombre?: string;
  /** Estilo de la bandera: circulo (default) o rectangulo redondeado (estilo WC26). */
  rect?: boolean;
};

// Codigos que no son banderas reales (equipos "Por definir").
const INVALIDOS = new Set(["", "xx"]);

// Bandera via flagcdn (gratis). code = ISO-3166 alpha-2 (ej "ar", "cl").
// Por defecto es circular; con rect=true sale en rectangulo redondeado (WC26).
// Si el codigo no es valido o la imagen falla, muestra el logo (Por definir).
export default function Flag({ code, size = 56, nombre, rect = false }: Props) {
  const c = (code || "").toLowerCase();
  const [fallo, setFallo] = useState(false);
  const usarLogo = INVALIDOS.has(c) || fallo;

  // En rectangulo: alto ~70% del ancho (proporcion bandera) y esquinas suaves.
  const h = rect ? Math.round(size * 0.7) : size;
  const forma = rect ? "rounded-lg" : "rounded-full";
  const dims = { width: size, height: h };

  if (usarLogo) {
    return (
      <img
        src="/logo.png"
        alt={nombre ?? "Por definir"}
        title={nombre ?? "Por definir"}
        width={size}
        height={h}
        className={`${forma} object-cover bg-carbon-card ring-1 ring-borde`}
        style={dims}
      />
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w160/${c}.png`}
      alt={nombre ?? c}
      width={size}
      height={h}
      loading="lazy"
      onError={() => setFallo(true)}
      className={`${forma} object-cover bg-carbon-card ring-1 ring-borde`}
      style={dims}
    />
  );
}
