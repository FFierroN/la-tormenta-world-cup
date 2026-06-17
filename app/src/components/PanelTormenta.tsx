import { obtenerDesgloseTormenta } from "../lib/data";
import type { FilaTormenta } from "../lib/types";
import { useAsync } from "../lib/useAsync";

// Nombres FIJOS de los 7 miembros, sin importar alias ni nombre en la base.
// La llave es el nombre real normalizado (minusculas, sin tildes).
// (El 8vo invitado original no quiso participar: la liga es de 7.)
const NOMBRES_FIJOS: Record<string, string> = {
  "felipe fierro": "Fierro",
  "victor soto": "Vitoko",
  "ignacio contreras": "Craneo",
  "jaime furio": "Pollo",
  "daniel abreu": "Cubano",
  "benjamin bustamante": "Benja",
  "ignacio gonzalez": "Camello",
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .trim();
}

function nombreFijo(f: FilaTormenta): string {
  return NOMBRES_FIJOS[normalizar(f.nombre)] ?? f.alias ?? f.nombre;
}

// Segmentos de la barra, de mejor a peor. Degradado verde -> rojo, y al final
// los no pronosticados en gris (de izquierda a derecha: lo mejor -> lo ausente).
const SEGMENTOS: {
  key: "exactos" | "diferencias" | "aciertos" | "fallas" | "no_pronosticados";
  label: string;
  clase: string; // color de fondo
}[] = [
  { key: "exactos", label: "Exactos", clase: "bg-emerald-400" },
  { key: "diferencias", label: "Diferencias", clase: "bg-amber-400" },
  { key: "aciertos", label: "Aciertos", clase: "bg-orange-500" },
  { key: "fallas", label: "Fallas", clase: "bg-rose-500" },
  { key: "no_pronosticados", label: "No pronosticados", clase: "bg-neutral-500" },
];

export default function PanelTormenta() {
  const { data, cargando, error } = useAsync(obtenerDesgloseTormenta, []);

  if (cargando) {
    return <div className="text-center text-neutral-400 py-10">Cargando...</div>;
  }
  if (error || !data) {
    return (
      <div className="text-center text-neutral-400 py-10">
        No se pudo cargar el desglose.
      </div>
    );
  }

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
      <div className="text-center text-sm font-semibold py-3 border-b border-borde">
        Tormenta
      </div>

      <ul className="px-4 py-3">
        {data.map((f) => (
          <FilaMiembro key={f.jugador_id} f={f} />
        ))}
      </ul>

      {/* Leyenda (simbologia) al fondo, debajo de las barras */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-3 border-t border-borde text-[11px] text-neutral-300">
        {SEGMENTOS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${s.clase}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FilaMiembro({ f }: { f: FilaTormenta }) {
  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-borde last:border-0">
      <span className="text-xs font-bold text-neutral-500 tabular-nums w-4 shrink-0">
        {f.posicion}
      </span>
      <span className="text-sm font-bold text-white w-20 shrink-0 truncate">
        {nombreFijo(f)}
      </span>
      <Barra f={f} />
    </li>
  );
}

function Barra({ f }: { f: FilaTormenta }) {
  if (f.total <= 0) {
    return <div className="flex-1 h-1.5 rounded-full bg-carbon-soft" />;
  }
  return (
    <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-carbon-soft">
      {SEGMENTOS.map((s) => {
        const n = f[s.key];
        if (n <= 0) return null;
        const pct = (n / f.total) * 100;
        return (
          <div
            key={s.key}
            className={s.clase}
            style={{ width: `${pct}%` }}
            title={`${s.label}: ${n} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}
