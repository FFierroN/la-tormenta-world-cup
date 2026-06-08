type Props = {
  src: string | null;
  nombre: string;
  size?: number;
  ring?: boolean;
};

// Avatar circular con fallback a inicial cuando aun no hay foto.
export default function Avatar({ src, nombre, size = 96, ring = false }: Props) {
  const inicial = (nombre?.trim()?.[0] ?? "?").toUpperCase();
  const cls = `rounded-full object-cover bg-carbon-card ${
    ring ? "ring-2 ring-oro" : ""
  }`;
  if (src) {
    return (
      <img
        src={src}
        alt={nombre}
        width={size}
        height={size}
        className={cls}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center text-neutral-300 font-bold ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={nombre}
    >
      {inicial}
    </div>
  );
}
