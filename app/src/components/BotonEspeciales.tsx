import { useNavigate } from "react-router-dom";

// Boton (con glow dorado) que lleva a las predicciones especiales.
// Reusado en Mi Cuenta y en la pantalla Copa (DRY).
export default function BotonEspeciales({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/especiales")}
      className={`glow-oro w-full bg-carbon-card border-2 border-oro rounded-2xl py-3 font-semibold text-oro active:bg-carbon-soft ${className}`}
    >
      Mis predicciones especiales
    </button>
  );
}
