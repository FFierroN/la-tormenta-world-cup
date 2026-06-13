import { useNavigate } from "react-router-dom";
import BotonCuenta from "./BotonCuenta";
import { EstrellaIcon } from "./IconosCuenta";
import { diasParaEspeciales } from "../lib/fechas";

// Boton (con glow dorado pulsante) que lleva a las predicciones especiales.
// Reusado en Mi cuenta, Copa y Partidos (DRY). Incluye etiqueta verde pulsante
// con la cuenta regresiva al cierre ("faltan / X dias").
export default function BotonEspeciales({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const dias = diasParaEspeciales();

  const etiqueta =
    dias > 0 ? (
      <span className="glow-verde flex flex-col items-center leading-tight rounded-lg bg-green-500/20 text-green-400 px-2.5 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide">faltan</span>
        <span className="text-sm font-black tabular-nums">
          {dias} {dias === 1 ? "dia" : "dias"}
        </span>
      </span>
    ) : (
      <span className="rounded-lg bg-rose-500/20 text-rose-400 px-2.5 py-1 text-xs font-bold">
        Cerrado
      </span>
    );

  return (
    <BotonCuenta
      icon={<EstrellaIcon />}
      onClick={() => navigate("/especiales")}
      right={etiqueta}
      glow
      className={className}
    >
      Realizar predicciones especiales
    </BotonCuenta>
  );
}
