// =====================================================================
// EspecialesDetalle.tsx  ·  /especiales/:jugadorId
// =====================================================================
// Pagina delgada: solo header + back. El cuerpo (total, banderas y desglose)
// vive en <EspecialesPanel/>, reutilizado tambien como pestana dentro del
// detalle de un participante (MisPredicciones).
import { useNavigate, useParams } from "react-router-dom";
import EspecialesPanel from "../components/EspecialesPanel";

export default function EspecialesDetalle() {
  const navigate = useNavigate();
  const { jugadorId } = useParams();

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Predicciones especiales</h1>
      </header>

      <EspecialesPanel jugadorId={jugadorId ?? null} />
    </div>
  );
}
