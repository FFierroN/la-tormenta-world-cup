import { useNavigate } from "react-router-dom";
import BotonCuenta from "./BotonCuenta";
import { EstrellaIcon } from "./IconosCuenta";
import { diasParaEspeciales } from "../lib/fechas";

// Boton (con glow dorado pulsante) que lleva a las predicciones especiales.
// Reusado en Mi cuenta y en Copa (DRY). Incluye cuenta regresiva al cierre.
export default function BotonEspeciales({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const dias = diasParaEspeciales();
  const cuenta =
    dias > 0 ? (
      <span className="text-xs font-bold tabular-nums">
        {dias} {dias === 1 ? "dia" : "dias"}
      </span>
    ) : (
      <span className="text-xs font-bold">Cerrado</span>
    );

  return (
    <BotonCuenta
      icon={<EstrellaIcon />}
      onClick={() => navigate("/especiales")}
      right={cuenta}
      glow
      className={className}
    >
      Realizar predicciones especiales
    </BotonCuenta>
  );
}
