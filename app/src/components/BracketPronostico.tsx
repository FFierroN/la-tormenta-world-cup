// =====================================================================
// BracketPronostico.tsx  ·  Cuadro INTERACTIVO del sandbox "que pasaria si".
// =====================================================================
// Mismo layout en espejo que BracketFinal, pero SOLO de Cuartos en adelante
// y con tarjetas ELEGIBLES: tocas un equipo para marcarlo ganador y el arbol
// propaga a los elegidos (Semis -> Final -> Campeon; y 3er puesto con los
// perdedores de semis). No navega ni suma puntos: es puro juego.
import type { ReactNode } from "react";
import { indexarPorSlot, type SlotLlave } from "../lib/bracket";
import { Label, VLine, MergeDown, MergeUp, Equipo } from "./bracketLayout";
import {
  resolverLado,
  type Picks,
  type Lado,
  SLOT_FINAL,
  SLOT_TERCERO,
} from "../lib/pronostico";

interface Props {
  slots: SlotLlave[];
  picks: Picks;
  onPick?: (slotCode: string, lado: Lado) => void; // ausente => solo lectura
}

export default function BracketPronostico({ slots, picks, onPick }: Props) {
  const ix = indexarPorSlot(slots);

  // Sin cuartos cargados en la BD todavia -> no hay nada jugable.
  const hayCuartos = ["P97", "P98", "P99", "P100"].some((c) => ix[c]);
  if (!hayCuartos) {
    return (
      <p className="px-4 py-8 text-center text-neutral-400 text-sm">
        El cuadro se habilita cuando esten definidos los cuartos de final.
      </p>
    );
  }

  const card = (code: string, big?: boolean) => (
    <SandboxCard code={code} ix={ix} picks={picks} onPick={onPick} big={big} />
  );

  return (
    <div className="px-3 pb-4 overflow-x-auto">
      <div className="min-w-[300px] max-w-md mx-auto">
        {/* Mitad superior: Cuartos -> Semis */}
        <Label>Cuartos de final</Label>
        <Banda>{[card("P97"), card("P98")]}</Banda>
        <MergeDown pares={1} />

        <Label>Semifinales</Label>
        <Banda>{[card("P101")]}</Banda>
        <VLine />

        {/* Centro: FINAL */}
        <Label neon>Final</Label>
        {card(SLOT_FINAL, true)}
        <VLine />

        {/* Mitad inferior (espejo): Semis -> Cuartos */}
        <Label>Semifinales</Label>
        <Banda>{[card("P102")]}</Banda>
        <MergeUp pares={1} />

        <Label>Cuartos de final</Label>
        <Banda>{[card("P99"), card("P100")]}</Banda>

        {/* Tercer puesto (aparte) */}
        <div className="mt-8">
          <Label>Tercer puesto</Label>
          <div className="max-w-[130px] mx-auto">{card(SLOT_TERCERO)}</div>
        </div>
      </div>
    </div>
  );
}

// Banda: reparte sus hijos (tarjetas) en columnas iguales, igual que el cuadro
// real, para que los conectores calcen.
function Banda({ children }: { children: ReactNode[] }) {
  return (
    <div className="flex">
      {children.map((c, i) => (
        <div key={i} className="flex-1 min-w-0 px-0.5">
          {c}
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- Tarjeta
// Dos equipos elegibles. El lado marcado (pick) se resalta con check verde.
// Si un lado aun no esta definido (falta pick aguas arriba), muestra el
// placeholder corto (G97 / P101...) y no es clickeable.
function SandboxCard({
  code,
  ix,
  picks,
  onPick,
  big,
}: {
  code: string;
  ix: Record<string, SlotLlave>;
  picks: Picks;
  onPick?: (slotCode: string, lado: Lado) => void;
  big?: boolean;
}) {
  const s = ix[code];
  if (!s) return null;

  const local = resolverLado(code, "local", ix, picks);
  const visita = resolverLado(code, "visita", ix, picks);
  const pick = picks[code];
  const editable = !!onPick && !!local && !!visita;

  const size = big ? 40 : 22;
  const wrap = big
    ? "rounded-2xl border border-neon-menta/50 bg-neon-menta/10 px-4 py-3 max-w-[300px] mx-auto"
    : "rounded-xl border border-borde bg-carbon-card px-1 py-2 max-w-[92px] mx-auto";

  return (
    <div className={wrap}>
      <div className={`flex items-start justify-center ${big ? "gap-3" : "gap-1"}`}>
        <LadoElegible
          equipo={local}
          corto={s.localCorto}
          size={size}
          elegido={pick === "local"}
          onClick={editable ? () => onPick!(code, "local") : undefined}
          esquinaIzq
        />
        {big && <span className="self-center text-2xl leading-none">{"\u{1F3C6}"}</span>}
        <LadoElegible
          equipo={visita}
          corto={s.visitaCorto}
          size={size}
          elegido={pick === "visita"}
          onClick={editable ? () => onPick!(code, "visita") : undefined}
        />
      </div>
    </div>
  );
}

// Un lado clickeable: envuelve el <Equipo> compartido en un boton cuando se
// puede elegir. Atenua el lado NO elegido cuando ya hay pick.
function LadoElegible({
  equipo,
  corto,
  size,
  elegido,
  onClick,
  esquinaIzq,
}: {
  equipo: { nombre: string; pais: string | null } | null;
  corto: string;
  size: number;
  elegido: boolean;
  onClick?: () => void;
  esquinaIzq?: boolean;
}) {
  const contenido = (
    <Equipo
      nombre={equipo?.nombre ?? null}
      pais={equipo?.pais ?? null}
      corto={corto}
      size={size}
      gano={elegido}
      esquinaIzq={esquinaIzq}
      checkClase="text-neon-menta"
    />
  );

  if (!onClick) {
    return <div className="flex-1 min-w-0 opacity-90">{contenido}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={elegido}
      aria-label={`Elegir a ${equipo?.nombre ?? corto}`}
      className={`flex-1 min-w-0 rounded-lg p-0.5 transition-all active:scale-95 ${
        elegido ? "bg-neon-menta/15 ring-1 ring-neon-menta/50" : "opacity-70 hover:opacity-100"
      }`}
    >
      {contenido}
    </button>
  );
}
