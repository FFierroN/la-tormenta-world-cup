// =====================================================================
// BracketFinal.tsx  ·  Cuadro CONECTADO en espejo (estilo 365scores / FIFA).
// =====================================================================
// Octavos -> Cuartos -> Semis -> FINAL (centro) -> Semis -> Cuartos ->
// Octavos, con lineas que unen cada partido con el de la ronda siguiente.
// El "Tercer puesto" va aparte al final (como la app FIFA).
//
// Truco de alineacion (DRY): tanto las bandas de tarjetas como los
// conectores usan columnas flex-1 iguales. Asi el centro de cada tarjeta
// cae en (i+0.5)/N del ancho, y cada conector dibuja sus lineas en 25% /
// 50% / 75% de su celda -> siempre calzan, sin importar el ancho real.
import Flag from "./Flag";
import type { ReactNode } from "react";
import { fmtHora, fmtDiaMes } from "../lib/fechas";
import { indexarPorSlot, type SlotLlave } from "../lib/bracket";

export default function BracketFinal({ slots }: { slots: SlotLlave[] }) {
  const ix = indexarPorSlot(slots);
  const g = (code: string): SlotLlave | undefined => ix[code];

  if (!g("P104")) {
    return (
      <p className="px-4 py-8 text-center text-neutral-400 text-sm">
        Aun no hay cuadro para mostrar.
      </p>
    );
  }

  return (
    <div className="px-3 pb-4 overflow-x-auto">
      <div className="min-w-[340px] max-w-md mx-auto">
        {/* ---------- Mitad superior: Octavos -> Cuartos -> Semis ---------- */}
        <Label>Octavos de final</Label>
        <Banda slots={[g("P89"), g("P90"), g("P93"), g("P94")]} />
        <MergeDown pares={2} />

        <Label>Cuartos de final</Label>
        <Banda slots={[g("P97"), g("P98")]} />
        <MergeDown pares={1} />

        <Label>Semifinales</Label>
        <Banda slots={[g("P101")]} />
        <VLine />

        {/* ---------- Centro: FINAL ---------- */}
        <Label dorado>Final</Label>
        <Card s={g("P104")} big />
        <VLine />

        {/* ---------- Mitad inferior (espejo): Semis -> Cuartos -> Octavos */}
        <Label>Semifinales</Label>
        <Banda slots={[g("P102")]} />
        <MergeUp pares={1} />

        <Label>Cuartos de final</Label>
        <Banda slots={[g("P99"), g("P100")]} />
        <MergeUp pares={2} />

        <Label>Octavos de final</Label>
        <Banda slots={[g("P91"), g("P92"), g("P95"), g("P96")]} />

        {/* ---------- Tercer puesto (aparte) ---------- */}
        <div className="mt-8">
          <Label>Tercer puesto</Label>
          <div className="max-w-[130px] mx-auto">
            <Card s={g("P103")} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Bandas
function Banda({ slots }: { slots: (SlotLlave | undefined)[] }) {
  return (
    <div className="flex">
      {slots.map((s, i) => (
        <div key={s?.slot ?? i} className="flex-1 min-w-0 px-0.5">
          <Card s={s} />
        </div>
      ))}
    </div>
  );
}

function Label({ children, dorado }: { children: ReactNode; dorado?: boolean }) {
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

// -------------------------------------------------------------- Tarjeta
function Card({ s, big }: { s?: SlotLlave; big?: boolean }) {
  if (!s) return null;

  if (big) {
    return (
      <div className="rounded-2xl border border-oro/50 bg-oro/10 px-4 py-3 max-w-[300px] mx-auto">
        <div className="flex items-center justify-between gap-2">
          <Equipo nombre={s.equipoLocal} pais={s.paisLocal} corto={s.localCorto} size={40} />
          <span className="text-2xl leading-none">{"\u{1F3C6}"}</span>
          <Equipo nombre={s.equipoVisita} pais={s.paisVisita} corto={s.visitaCorto} size={40} />
        </div>
        <div className="text-center mt-1">
          <div className="text-lg font-bold tabular-nums leading-tight">{fmtHora(s.fecha)}</div>
          <div className="text-[10px] text-neutral-400 tabular-nums">{fmtDiaMes(s.fecha)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-borde bg-carbon-card px-1 py-1.5 w-full max-w-[92px] mx-auto">
      <div className="text-[9px] text-neutral-400 text-center tabular-nums leading-none mb-1">
        {fmtHora(s.fecha)}
      </div>
      <div className="flex items-start justify-center gap-1">
        <Equipo nombre={s.equipoLocal} pais={s.paisLocal} corto={s.localCorto} size={22} />
        <Equipo nombre={s.equipoVisita} pais={s.paisVisita} corto={s.visitaCorto} size={22} />
      </div>
      <div className="text-[9px] text-neutral-500 text-center tabular-nums leading-none mt-1">
        {fmtDiaMes(s.fecha)}
      </div>
    </div>
  );
}

// Un equipo dentro de la tarjeta: bandera arriba, codigo/nombre abajo.
function Equipo({
  nombre,
  pais,
  corto,
  size,
}: {
  nombre: string | null;
  pais: string | null;
  corto: string;
  size: number;
}) {
  const definido = !!nombre;
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
      <Flag code={pais ?? "XX"} size={size} nombre={nombre ?? corto} />
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

// ------------------------------------------------------------ Conectores
// Linea vertical simple (Semis<->Final).
function VLine() {
  return <div className="h-5 w-px bg-borde mx-auto" aria-hidden="true" />;
}

// Une 2 hijos (arriba) en 1 padre (abajo). 'pares' = nro de padres.
function MergeDown({ pares }: { pares: number }) {
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
function MergeUp({ pares }: { pares: number }) {
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
