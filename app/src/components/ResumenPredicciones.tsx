import type { MiPrediccion, ResultadoPrediccion } from "../lib/types";

// Categorias de resultado con su color (mismo criterio cromatico que el resto
// de la app: verde=exacto, ambar=diferencia, naranja=acierto, rojo=falla).
const CATS: {
  key: ResultadoPrediccion;
  label: string;
  dot: string;
  text: string;
  bar: string;
}[] = [
  { key: "exacto", label: "Exactos", dot: "bg-emerald-400", text: "text-emerald-400", bar: "bg-emerald-400" },
  { key: "diferencia", label: "Diferencia", dot: "bg-amber-400", text: "text-amber-400", bar: "bg-amber-400" },
  { key: "acierto", label: "Aciertos", dot: "bg-orange-400", text: "text-orange-400", bar: "bg-orange-400" },
  { key: "falla", label: "Fallas", dot: "bg-rose-500", text: "text-rose-400", bar: "bg-rose-500" },
];

// Tarjeta resumen que se muestra al tope de "Mis predicciones" (propias o de
// otro participante). Calcula todo en el cliente a partir de las filas; las
// metricas se basan SOLO en partidos jugados (los unicos con puntaje).
export default function ResumenPredicciones({ filas }: { filas: MiPrediccion[] }) {
  if (filas.length === 0) return null;

  const jugados = filas.filter((p) => p.estado === "final" && p.resultado);
  const n = jugados.length;
  const puntos = jugados.reduce((s, p) => s + (p.puntos ?? 0), 0);
  const counts = Object.fromEntries(
    CATS.map((c) => [c.key, jugados.filter((p) => p.resultado === c.key).length])
  ) as Record<ResultadoPrediccion, number>;
  const aciertosTot = counts.exacto + counts.diferencia + counts.acierto;
  const efectividad = n ? Math.round((aciertosTot / n) * 100) : 0;
  const promedio = n ? puntos / n : 0;

  return (
    <section className="px-4 mt-3">
      <div className="bg-carbon-card border border-borde rounded-2xl p-4">
        {/* Cifras principales */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Cifra valor={String(puntos)} etiqueta="puntos" oro />
          <Cifra valor={promedio.toFixed(1)} etiqueta="pts/partido" />
          <Cifra valor={`${efectividad}%`} etiqueta="efectividad" />
        </div>

        {/* Barra de distribucion (proporcion visual de como le fue) */}
        {n > 0 && (
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-carbon-soft">
            {CATS.map((c) =>
              counts[c.key] > 0 ? (
                <div
                  key={c.key}
                  className={c.bar}
                  style={{ width: `${(counts[c.key] / n) * 100}%` }}
                  aria-hidden="true"
                />
              ) : null
            )}
          </div>
        )}

        {/* Leyenda con contadores por categoria */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {CATS.map((c) => (
            <div key={c.key}>
              <div className={`text-lg font-bold tabular-nums ${c.text}`}>{counts[c.key]}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pie: cuantos lleva jugados / pronosticados */}
        <div className="mt-3 pt-3 border-t border-borde/60 text-center text-[11px] text-neutral-500">
          {n} jugado{n === 1 ? "" : "s"}
          {filas.length !== n && <> · {filas.length} pronosticado{filas.length === 1 ? "" : "s"}</>}
        </div>
      </div>
    </section>
  );
}

function Cifra({ valor, etiqueta, oro = false }: { valor: string; etiqueta: string; oro?: boolean }) {
  return (
    <div>
      <div className={`text-3xl font-black tabular-nums leading-none ${oro ? "text-oro" : ""}`}>
        {valor}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-400 mt-1">{etiqueta}</div>
    </div>
  );
}
