// =====================================================================
// LlavesView.tsx  ·  Pestana "Llaves" dentro de Copa (Opcion B / 365scores).
// =====================================================================
// Dos sub-pestanas:
//   - "Dieciseisavos": lista de los 16 cruces (con placeholders 1A/3C.. o
//     bandera+nombre cuando ya hay equipo).
//   - "Fase Final": cuadro compacto de Octavos -> Cuartos -> Semis -> Final
//     (+ 3er puesto), apilado por fase.
// Hoy lee de un TEMPLATE MOCK (ver lib/bracket.ts). Cuando llegue el cuadro
// oficial, solo cambia la fuente de datos; este componente no se toca.
import { useState, type ReactNode } from "react";
import Flag from "./Flag";
import { fmtFechaHora } from "../lib/fechas";
import {
  obtenerLlavesMock,
  slotsPorFase,
  type FaseLlave,
  type SlotLlave,
} from "../lib/bracket";

type SubTab = "dieciseisavos" | "final";

export default function LlavesView() {
  const [sub, setSub] = useState<SubTab>("dieciseisavos");
  const slots = obtenerLlavesMock();

  return (
    <div className="pb-2">
      {/* Sub-pestanas (chips) */}
      <div className="flex gap-2 px-4 py-3">
        <Chip activo={sub === "dieciseisavos"} onClick={() => setSub("dieciseisavos")}>
          Dieciseisavos
        </Chip>
        <Chip activo={sub === "final"} onClick={() => setSub("final")}>
          Fase Final
        </Chip>
      </div>

      {/* Aviso: datos de ejemplo (se quita cuando llegue el cuadro oficial). */}
      <p className="px-4 pb-2 text-[11px] text-neutral-500">
        Vista previa · los cruces se completan al cerrar los grupos.
      </p>

      {sub === "dieciseisavos" ? (
        <ListaDieciseisavos slots={slotsPorFase(slots, "Dieciseisavos")} />
      ) : (
        <FaseFinal slots={slots} />
      )}
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

// --------------------------------------------------------- Dieciseisavos
function ListaDieciseisavos({ slots }: { slots: SlotLlave[] }) {
  if (slots.length === 0) {
    return <Vacio />;
  }
  return (
    <ul className="px-4 flex flex-col gap-3">
      {slots.map((s) => (
        <li key={s.slot}>
          <CardCruce s={s} />
        </li>
      ))}
    </ul>
  );
}

// Tarjeta horizontal: [equipo local] — fecha/hora — [equipo visita].
function CardCruce({ s }: { s: SlotLlave }) {
  return (
    <article className="bg-carbon-card border border-borde rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <LadoEquipo
          nombre={s.equipoLocal}
          pais={s.paisLocal}
          placeholder={s.local}
          alinear="start"
        />
        <div className="shrink-0 text-center px-1">
          <div className="text-[11px] text-neutral-400 tabular-nums leading-tight">
            {fmtFechaHora(s.fecha)}
          </div>
          {s.ciudad && (
            <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
              {s.ciudad}
            </div>
          )}
        </div>
        <LadoEquipo
          nombre={s.equipoVisita}
          pais={s.paisVisita}
          placeholder={s.visita}
          alinear="end"
        />
      </div>
    </article>
  );
}

// Un lado de la tarjeta. Si hay equipo real -> bandera + nombre.
// Si no -> escudo generico + placeholder (1A / 3C/D/F/G/H).
function LadoEquipo({
  nombre,
  pais,
  placeholder,
  alinear,
}: {
  nombre?: string | null;
  pais?: string | null;
  placeholder: string;
  alinear: "start" | "end";
}) {
  const definido = !!nombre;
  const lado = alinear === "start" ? "flex-row" : "flex-row-reverse";
  const texto = alinear === "start" ? "text-left" : "text-right";
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-2 ${lado}`}>
      <Flag code={pais ?? "XX"} size={32} nombre={nombre ?? placeholder} />
      <span
        className={`min-w-0 truncate text-sm leading-tight ${texto} ${
          definido ? "font-semibold" : "text-neutral-500"
        }`}
        title={nombre ?? placeholder}
      >
        {definido ? nombre : placeholder}
      </span>
    </div>
  );
}

// --------------------------------------------------------- Fase Final
// Cuadro compacto: una seccion por fase (Octavos -> Final + 3er puesto),
// cada cruce como mini-tarjeta de dos lados apilados.
const FASES_FINAL: FaseLlave[] = [
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Final",
  "Tercer Puesto",
];

function FaseFinal({ slots }: { slots: SlotLlave[] }) {
  return (
    <div className="px-4 flex flex-col gap-6">
      {FASES_FINAL.map((fase) => {
        const ss = slotsPorFase(slots, fase);
        if (ss.length === 0) return null;
        return (
          <section key={fase}>
            <h3 className="mb-2 text-sm font-bold text-oro uppercase tracking-wide">
              {etiquetaFase(fase)}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {ss.map((s) => (
                <MiniCruce key={s.slot} s={s} destacado={fase === "Final"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function etiquetaFase(fase: FaseLlave): string {
  if (fase === "Tercer Puesto") return "Tercer puesto";
  return fase;
}

// Mini-tarjeta con los dos lados apilados (estilo cuadro 365scores).
function MiniCruce({ s, destacado }: { s: SlotLlave; destacado?: boolean }) {
  return (
    <article
      className={`rounded-2xl p-3 border ${
        destacado
          ? "bg-oro/10 border-oro/50 col-span-2"
          : "bg-carbon-card border-borde"
      }`}
    >
      <div className="text-[10px] text-neutral-400 tabular-nums mb-2 text-center">
        {fmtFechaHora(s.fecha)}
      </div>
      <div className="flex flex-col gap-1.5">
        <LineaEquipo nombre={s.equipoLocal} pais={s.paisLocal} placeholder={s.local} />
        <LineaEquipo nombre={s.equipoVisita} pais={s.paisVisita} placeholder={s.visita} />
      </div>
    </article>
  );
}

function LineaEquipo({
  nombre,
  pais,
  placeholder,
}: {
  nombre?: string | null;
  pais?: string | null;
  placeholder: string;
}) {
  const definido = !!nombre;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Flag code={pais ?? "XX"} size={22} nombre={nombre ?? placeholder} />
      <span
        className={`min-w-0 truncate text-xs leading-tight ${
          definido ? "font-semibold" : "text-neutral-500"
        }`}
        title={nombre ?? placeholder}
      >
        {definido ? nombre : placeholder}
      </span>
    </div>
  );
}

function Vacio() {
  return (
    <p className="px-4 py-8 text-center text-neutral-400 text-sm">
      Aun no hay cruces para mostrar.
    </p>
  );
}
