// =====================================================================
// PrediccionesView.tsx  ·  Pestana "Predicciones" (dentro de Tabla).
// =====================================================================
// Dos sub-pestanas:
//   - "Especiales" (default): las predicciones especiales del inicio de todos
//     (lista + acordeon) -> PrediccionesTodos.
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
      <div className="flex gap-2 px-4 pb-3">
        <Chip activo={sub === "especiales"} onClick={() => setSub("especiales")}>
          Especiales
        </Chip>
        <Chip activo={sub === "llaves"} onClick={() => setSub("llaves")}>
          Llaves
        </Chip>
      </div>

      {sub === "especiales" ? <PrediccionesTodos /> : <LlavesPredicciones />}
    </div>
  );
}

function Chip({
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
      className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
        activo
          ? "bg-oro text-carbon"
          : "bg-carbon-card text-neutral-300 border border-borde active:bg-carbon-soft"
      }`}
    >
      {children}
    </button>
  );
}
