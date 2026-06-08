type Props = { code: string; size?: number; nombre?: string };

// Bandera circular via flagcdn (gratis). code = ISO-3166 alpha-2 (ej "ar", "cl").
export default function Flag({ code, size = 56, nombre }: Props) {
  const c = (code || "").toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w160/${c}.png`}
      alt={nombre ?? c}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-full object-cover bg-carbon-card ring-1 ring-borde"
      style={{ width: size, height: size }}
    />
  );
}
