// Pantalla de detalle de un ranking del torneo. Se llega desde la pestana
// "Estadisticas" de Copa al clickear cualquiera de las 6 tablas.
// Ruta: /copa/estadisticas/:tipo  (tipo = key en TIPOS_ESTADISTICA).
//
// Muestra la lista COMPLETA (sin cortar) del ranking seleccionado. Si el
// slug no matchea ningun tipo conocido, redirige a Copa.
import { useNavigate, useParams, Navigate } from "react-router-dom";
import ListaGoleo from "../components/ListaGoleo";
import { obtenerEstadisticas } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { tipoEstadisticaPorKey } from "../components/estadisticasMeta";

export default function EstadisticaDetalle() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const meta = tipoEstadisticaPorKey(tipo);
  const { data, cargando, error } = useAsync(obtenerEstadisticas, []);

  // Slug desconocido -> back to Copa. No es un error tecnico, es 404 logico.
  if (!meta) return <Navigate to="/copa" replace />;

  const filas = data ? meta.extraer(data) : [];

  return (
    <div className="max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-borde">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center flex-shrink-0"
          aria-label="Volver"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {meta.icono}
          <h1 className="text-lg font-bold truncate">{meta.label}</h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {cargando && (
          <p className="text-neutral-400 text-sm">Cargando ranking...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm">
            No se pudo cargar el ranking. Revisa la conexion con Supabase.
          </p>
        )}
        {!cargando && !error && (
          // Sin 'href' -> ListaGoleo muestra la lista completa, sin link.
          <ListaGoleo
            titulo={`Todos (${filas.length})`}
            filas={filas}
            icono={meta.icono}
            sufijo={meta.sufijo}
          />
        )}
      </div>
    </div>
  );
}
