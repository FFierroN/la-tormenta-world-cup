import { obtenerDesgloseTormenta } from "../lib/data";
import type { FilaTormenta } from "../lib/types";
import { useAsync } from "../lib/useAsync";

// Nombres FIJOS de los 8 miembros, sin importar alias ni nombre en la base.
// La llave es el nombre real normalizado (minusculas, sin tildes).
// FALTA EL 8VO: agregar aqui cuando Felipe lo confirme.
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

// Segmentos de la barra, de mejor a peor. Tonos de azul + blanco.
const SEGMENTOS: {
  key: "exactos" | "diferencias" | "aciertos" | "fallas";
  label: string;
  clase: string; // color de fondo
  texto: string; // color del numero encima
}[] = [
  { key: "exactos", label: "Exactos", clase: "bg-white", texto: "text-carbon" },
  { key: "diferencias", label: "Diferencias", clase: "bg-sky-300", texto: "text-carbon" },
  { key: "aciertos", label: "Aciertos", clase: "bg-sky-600", texto: "text-white" },
  { key: "fallas", label: "Fallas", clase: "bg-sky-900", texto: "text-white" },
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
        LaTormenta
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-3 text-[11px] text-neutral-300">
        {SEGMENTOS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${s.clase}`} />
            {s.label}
          </span>
        ))}
      </div>

      <ul className="px-4 pb-3">
        {data.map((f) => (
          <FilaMiembro key={f.jugador_id} f={f} />
        ))}
      </ul>
    </div>
  );
}

function FilaMiembro({ f }: { f: FilaTormenta }) {
  return (
    <li className="py-2.5 border-b border-borde last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-neutral-500 tabular-nums w-5">
          {f.posicion}
        </span>
        <span className="text-sm font-bold text-white">{nombreFijo(f)}</span>
        <span className="ml-auto text-[11px] text-neutral-500 tabular-nums">
          {f.total} pron.
        </span>
      </div>
      <Barra f={f} />
    </li>
  );
}

function Barra({ f }: { f: FilaTormenta }) {
  if (f.total <= 0) {
    return (
      <div className="h-6 rounded-full bg-carbon-soft flex items-center justify-center text-[11px] text-neutral-500">
        Sin pronosticos aun
      </div>
    );
  }
  return (
    <div className="flex h-6 rounded-full overflow-hidden bg-carbon-soft">
      {SEGMENTOS.map((s) => {
        const n = f[s.key];
        if (n <= 0) return null;
        const pct = (n / f.total) * 100;
        return (
          <div
            key={s.key}
            className={`flex items-center justify-center ${s.clase} ${s.texto}`}
            style={{ width: `${pct}%` }}
            title={`${s.label}: ${n} (${Math.round(pct)}%)`}
          >
            <span className="text-[10px] font-bold tabular-nums px-0.5">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
