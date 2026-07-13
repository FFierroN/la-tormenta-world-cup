// Pestana "Estadisticas" dentro de Copa. Muestra 6 rankings del torneo,
// todos sacados de partido_eventos (una sola query, agregado en cliente).
//
// Cada tabla muestra top 5 y es CLICKEABLE: lleva a /copa/estadisticas/:key
// con la lista completa. Los 6 tipos, su orden y su metadata (label, icono,
// sufijo) viven en components/estadisticasMeta.tsx (fuente unica).
import ListaGoleo from "./ListaGoleo";
import { obtenerEstadisticas } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { TIPOS_ESTADISTICA } from "./estadisticasMeta";

export default function PanelEstadisticas() {
  const { data, cargando, error } = useAsync(obtenerEstadisticas, []);

  if (cargando) {
    return (
      <div className="px-4 py-4">
        <p className="text-neutral-400 text-sm">Cargando estadisticas...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-4">
        <p className="text-red-400 text-sm">
          No se pudieron cargar las estadisticas. Revisa la conexion con
          Supabase.
        </p>
      </div>
    );
  }
  if (!data) return null;

  const hayAlgo = TIPOS_ESTADISTICA.some((t) => t.extraer(data).length > 0);
  if (!hayAlgo) {
    return (
      <div className="px-4 py-4">
        <p className="text-neutral-400 text-sm">
          Aun no hay eventos registrados en el torneo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 pb-2">
      {TIPOS_ESTADISTICA.map((t) => (
        <ListaGoleo
          key={t.key}
          titulo={t.label}
          filas={t.extraer(data)}
          icono={t.icono}
          sufijo={t.sufijo}
          href={`/copa/estadisticas/${t.key}`}
        />
      ))}
    </div>
  );
}
