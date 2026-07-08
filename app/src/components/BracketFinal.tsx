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
import { useNavigate } from "react-router-dom";
import { fmtHora, fmtDiaMes } from "../lib/fechas";
import { indexarPorSlot, type SlotLlave } from "../lib/bracket";
import { Label, VLine, MergeDown, MergeUp, Equipo } from "./bracketLayout";

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

// -------------------------------------------------------------- Tarjeta
// Toda la tarjeta es un boton -> abre el detalle/pronostico del partido.
function Card({ s, big }: { s?: SlotLlave; big?: boolean }) {
  const navigate = useNavigate();
  if (!s) return null;
  const ir = () => navigate(`/partido/${s.id}`);

  if (big) {
    return (
      <button
        onClick={ir}
        className="block w-full rounded-2xl border border-oro/50 bg-oro/10 px-4 py-3 max-w-[300px] mx-auto active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between gap-2">
          <Equipo nombre={s.equipoLocal} pais={s.paisLocal} corto={s.localCorto} size={40} gano={s.ganador === "local"} />
          <span className="text-2xl leading-none">{"\u{1F3C6}"}</span>
          <Equipo nombre={s.equipoVisita} pais={s.paisVisita} corto={s.visitaCorto} size={40} gano={s.ganador === "visita"} />
        </div>
        <div className="text-center mt-1">
          <div className="text-lg font-bold tabular-nums leading-tight">{fmtHora(s.fecha)}</div>
          <div className="text-[10px] text-neutral-400 tabular-nums">{fmtDiaMes(s.fecha)}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={ir}
      className="block w-full rounded-xl border border-borde bg-carbon-card px-1 py-1.5 max-w-[92px] mx-auto active:scale-[0.97] transition-transform"
    >
      <div className="text-[9px] text-neutral-400 text-center tabular-nums leading-none mb-1">
        {fmtHora(s.fecha)}
      </div>
      <div className="flex items-start justify-center gap-1">
        <Equipo nombre={s.equipoLocal} pais={s.paisLocal} corto={s.localCorto} size={22} gano={s.ganador === "local"} />
        <Equipo nombre={s.equipoVisita} pais={s.paisVisita} corto={s.visitaCorto} size={22} gano={s.ganador === "visita"} />
      </div>
      <div className="text-[9px] text-neutral-500 text-center tabular-nums leading-none mt-1">
        {fmtDiaMes(s.fecha)}
      </div>
    </button>
  );
}

