// =====================================================================
// PrediccionesView.tsx  ·  Pestana "Predicciones" (dentro de Tabla).
// =====================================================================
// Dos sub-pestanas:
//   - "Especiales" (default): lista de participantes (avatar + campeon elegido);
//     al tocar uno se abre su detalle -> PrediccionesTodos.
//   - "Llaves": el sandbox "que pasaria si" (cuadro del campeon) -> lista de
//     participantes + podio mas elegido -> LlavesPredicciones.
import { useState, type ReactNode } from "react";
import PrediccionesTodos from "./PrediccionesTodos";
import LlavesPredicciones from "./LlavesPredicciones";

type Sub = "especiales" | "llaves";

export default function PrediccionesView() {
  const [sub, setSub] = useState<Sub>("especiales");

  return (
    <div className="pt-3">
      <div className="px-4">
        <div className="grid grid-cols-2 mb-2 border-b border-borde">
          <SubBtn activo={sub === "especiales"} onClick={() => setSub("especiales")}>
            Especiales
          </SubBtn>
          <SubBtn activo={sub === "llaves"} onClick={() => setSub("llaves")}>
            Llaves
          </SubBtn>
        </div>
      </div>

      {sub === "especiales" ? <PrediccionesTodos /> : <LlavesPredicciones />}
    </div>
  );
}

function SubBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-center text-sm font-semibold transition-colors ${
        activo
          ? "text-white border-b-2 border-oro"
          : "text-neutral-400 border-b-2 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
