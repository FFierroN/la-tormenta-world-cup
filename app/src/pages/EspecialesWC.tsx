// Pagina: predicciones especiales de todos los participantes, en orden de tabla
// (ruta /especiales-todos). El cuerpo vive en el componente reutilizable
// PrediccionesTodos (DRY); aqui solo ponemos el header con boton de volver.
// La misma lista se muestra ahora como pestana "Predicciones" dentro de Tabla.
import { useNavigate } from "react-router-dom";
import PrediccionesTodos from "../components/PrediccionesTodos";

export default function EspecialesWC() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/cuenta")} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Predicciones especiales</h1>
          <p className="text-xs text-neutral-400">
            De todos los participantes, en orden de tabla.
          </p>
        </div>
      </header>

      <PrediccionesTodos />
    </div>
  );
}
