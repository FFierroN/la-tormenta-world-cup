// =====================================================================
// bracketLayout.tsx  ·  Primitivas visuales COMPARTIDAS del cuadro.
// =====================================================================
// Las usan BracketFinal (cuadro real, navega al partido) y BracketPronostico
// (sandbox "que pasaria si", elige ganador). DRY: labels, conectores en
// espejo y la ficha de un equipo viven aca una sola vez.
import type { ReactNode } from "react";
import Flag from "./Flag";
import { CheckIcon } from "./Iconos";

// Titulo de una ronda (Octavos / Cuartos / ...). 'dorado' resalta la Final.
export function Label({ children, dorado }: { children: ReactNode; dorado?: boolean }) {
  return (
    <h3
      className={`text-center text-xs font-bold my-2 ${
        dorado ? "text-oro" : "text-neutral-300"
      }`}
    >
      {children}
    </h3>
  );
}

// Linea vertical simple (Semis <-> Final).
export function VLine() {
  return <div className="h-5 w-px bg-borde mx-auto" aria-hidden="true" />;
}

// Une 2 hijos (arriba) en 1 padre (abajo). 'pares' = nro de padres.
export function MergeDown({ pares }: { pares: number }) {
  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: pares }).map((_, i) => (
        <div key={i} className="relative flex-1 h-5">
          <span className="absolute top-0 h-2.5 w-px bg-borde" style={{ left: "25%" }} />
          <span className="absolute top-0 h-2.5 w-px bg-borde" style={{ left: "75%" }} />
          <span className="absolute top-2.5 h-px bg-borde" style={{ left: "25%", right: "25%" }} />
          <span className="absolute top-2.5 h-2.5 w-px bg-borde" style={{ left: "50%" }} />
        </div>
      ))}
    </div>
  );
}

// Une 1 padre (arriba) en 2 hijos (abajo). 'pares' = nro de padres.
export function MergeUp({ pares }: { pares: number }) {
  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: pares }).map((_, i) => (
        <div key={i} className="relative flex-1 h-5">
          <span className="absolute top-0 h-2.5 w-px bg-borde" style={{ left: "50%" }} />
          <span className="absolute top-2.5 h-px bg-borde" style={{ left: "25%", right: "25%" }} />
          <span className="absolute top-2.5 h-2.5 w-px bg-borde" style={{ left: "25%" }} />
          <span className="absolute top-2.5 h-2.5 w-px bg-borde" style={{ left: "75%" }} />
        </div>
      ))}
    </div>
  );
}

// Un equipo dentro de una tarjeta: bandera arriba, codigo/nombre abajo.
// 'gano' pinta un check verde en la esquina de la bandera (ganador real o
// elegido en el sandbox). 'esquinaIzq' pone el check a la izquierda.
export function Equipo({
  nombre,
  pais,
  corto,
  size,
  gano,
  esquinaIzq,
}: {
  nombre: string | null;
  pais: string | null;
  corto: string;
  size: number;
  gano?: boolean;
  esquinaIzq?: boolean;
}) {
  const definido = !!nombre;
  const esquina = esquinaIzq ? "-left-1.5" : "-right-1.5";
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
      <div className="relative shrink-0">
        <Flag code={pais ?? "XX"} size={size} nombre={nombre ?? corto} />
        {gano && (
          <span
            className={`absolute -top-1.5 ${esquina} grid place-items-center rounded-full bg-carbon p-px shadow`}
            aria-label="Ganador"
          >
            <CheckIcon className="w-3 h-3 text-green-400" />
          </span>
        )}
      </div>
      <span
        className={`text-[9px] leading-none text-center truncate max-w-full ${
          definido ? "font-semibold text-neutral-100" : "text-neutral-400"
        }`}
        title={nombre ?? corto}
      >
        {definido ? nombre : corto}
      </span>
    </div>
  );
}
