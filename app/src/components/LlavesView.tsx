// =====================================================================
// LlavesView.tsx  ·  Pestana "Llaves" dentro de Copa (estilo 365scores).
// =====================================================================
// Dos sub-pestanas:
//   - "Dieciseisavos": lista de los 16 cruces (con placeholders 1A / 2B /
//     3C/D/F/G/H, o bandera+nombre cuando ya hay equipo).
//   - "Fase Final": CUADRO conectado en espejo (Octavos -> Final -> Octavos
//     + 3er puesto) -> ver BracketFinal.tsx.
// Lee los partidos REALES de Supabase (listarPartidos) y arma el cuadro con
// construirLlaves(). Mientras un equipo no este definido, muestra el
// placeholder del 'origen' (1A / 3C/D/F/G/H / Gan. P73 ...).
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Flag from "./Flag";
import BracketFinal from "./BracketFinal";
import { CheckIcon } from "./Iconos";
import { fmtFechaHora } from "../lib/fechas";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { construirLlaves, dieciseisavosEnOrden, type SlotLlave } from "../lib/bracket";

type SubTab = "dieciseisavos" | "final";

export default function LlavesView() {
  const [sub, setSub] = useState<SubTab>("final");
  const { data, cargando, error } = useAsync(listarPartidos, []);
  const slots = construirLlaves(data ?? []);

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

      {cargando && (
        <p className="px-4 py-6 text-neutral-400 text-sm">Cargando llaves...</p>
      )}
      {error && (
        <p className="px-4 py-6 text-red-400 text-sm">
          No se pudo cargar el cuadro. Revisa la conexion con Supabase.
        </p>
      )}

      {!cargando && !error && (
        sub === "dieciseisavos" ? (
          <ListaDieciseisavos slots={dieciseisavosEnOrden(slots)} />
        ) : (
          <BracketFinal slots={slots} />
        )
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
    return (
      <p className="px-4 py-8 text-center text-neutral-400 text-sm">
        Aun no hay cruces para mostrar.
      </p>
    );
  }
  // Agrupados de a 2: cada par alimenta el mismo octavo, asi que van casi
  // juntos (gap chico) y separados del siguiente par por un espacio mayor.
  const pares: SlotLlave[][] = [];
  for (let i = 0; i < slots.length; i += 2) pares.push(slots.slice(i, i + 2));

  return (
    <div className="px-4 flex flex-col gap-6">
      {pares.map((par, gi) => (
        <div key={gi} className="flex flex-col gap-1.5">
          {par.map((s) => (
            <CardCruce key={s.slot} s={s} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Tarjeta horizontal: [equipo local] — fecha/hora — [equipo visita].
// Toda la tarjeta es un boton -> abre el detalle/pronostico del partido.
// Sin borde: los pares se distinguen por el agrupamiento (espaciado).
function CardCruce({ s }: { s: SlotLlave }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/partido/${s.id}`)}
      className="w-full text-left bg-carbon-card rounded-2xl p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between gap-2">
        <LadoEquipo
          nombre={s.equipoLocal}
          pais={s.paisLocal}
          placeholder={s.local}
          alinear="start"
          gano={s.ganador === "local"}
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
          gano={s.ganador === "visita"}
        />
      </div>
    </button>
  );
}

// Un lado de la tarjeta. Si hay equipo real -> bandera + nombre.
// Si no -> escudo generico + placeholder (1A / 3C/D/F/G/H).
function LadoEquipo({
  nombre,
  pais,
  placeholder,
  alinear,
  gano,
}: {
  nombre?: string | null;
  pais?: string | null;
  placeholder: string;
  alinear: "start" | "end";
  gano?: boolean; // este lado gano -> check en la esquina exterior de la bandera
}) {
  const definido = !!nombre;
  const lado = alinear === "start" ? "flex-row" : "flex-row-reverse";
  const texto = alinear === "start" ? "text-left" : "text-right";
  const esquina = alinear === "start" ? "-left-1.5" : "-right-1.5";
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-2 ${lado}`}>
      <div className="relative shrink-0">
        <Flag code={pais ?? "XX"} size={32} nombre={nombre ?? placeholder} />
        {gano && (
          <span
            className={`absolute -top-1.5 ${esquina} grid place-items-center rounded-full bg-carbon p-px shadow`}
            aria-label="Ganador"
          >
            <CheckIcon className="w-3.5 h-3.5 text-green-400" />
          </span>
        )}
      </div>
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
