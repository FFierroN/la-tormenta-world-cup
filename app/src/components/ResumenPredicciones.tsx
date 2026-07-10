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
  { key: "diferencia", label: "Difer.", dot: "bg-amber-400", text: "text-amber-400", bar: "bg-amber-400" },
  { key: "acierto", label: "Aciertos", dot: "bg-orange-400", text: "text-orange-400", bar: "bg-orange-400" },
  { key: "falla", label: "Fallas", dot: "bg-rose-500", text: "text-rose-400", bar: "bg-rose-500" },
];

// Tarjeta resumen al tope de "Mis predicciones" (propias o de otro).
//
// CLAVE: el denominador de efectividad y promedio es el total de partidos YA
// JUGADOS del torneo (prop `totalJugados`), no solo los que el jugador
// pronostico. Asi, un partido jugado SIN pronostico cuenta como oportunidad
// perdida (0 pts) y la efectividad es justa entre quien apuesta a todo y quien
// apuesta a poco. Si no se pasa `totalJugados`, cae al conteo de pronosticados.
export default function ResumenPredicciones({
  filas,
  totalJugados,
}: {
  filas: MiPrediccion[];
  totalJugados?: number;
}) {
  if (filas.length === 0) return null;

  const jugados = filas.filter((p) => p.estado === "final" && p.resultado);
  const conPron = jugados.length; // partidos jugados que SI pronostico
  // Puntos de pronostico + puntos de la definicion del empate (empate/penales).
  // El total que se muestra debe incluir AMBOS (antes solo sumaba pronostico).
  const puntosPron = jugados.reduce((s, p) => s + (p.puntos ?? 0), 0);
  const puntosDef = jugados.reduce((s, p) => s + (p.puntos_definicion ?? 0), 0);
  const puntos = puntosPron + puntosDef;
  const counts = Object.fromEntries(
    CATS.map((c) => [c.key, jugados.filter((p) => p.resultado === c.key).length])
  ) as Record<ResultadoPrediccion, number>;

  // Denominador justo: total de partidos jugados del torneo (si lo tenemos).
  const base = Math.max(totalJugados ?? conPron, conPron);
  const noPron = Math.max(base - conPron, 0); // jugados que NO pronostico
  const aciertosTot = counts.exacto + counts.diferencia + counts.acierto;
  const efectividad = base ? Math.round((aciertosTot / base) * 100) : 0;
  const promedio = base ? puntos / base : 0;

  return (
    <section className="px-4 mt-3">
      <div className="bg-carbon-card border border-borde rounded-2xl p-4">
        {/* Cifras principales. El puntaje va arriba centrado; si hay puntos de
            definicion (empate/penales) se muestra desglosado:
            146 (Gral) + 8 pts (empate/penales). Debajo, en 2 columnas,
            pts/partido y efectividad -> distribucion simetrica en la caja. */}
        {puntosDef > 0 ? (
          <div className="flex items-start justify-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black tabular-nums leading-none text-oro">
                {puntosPron}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-neutral-400 mt-1">
                Gral
              </span>
            </div>
            <span className="text-2xl font-black text-white leading-none mt-1">+</span>
            <div className="flex flex-col items-center">
              <span className="leading-none">
                <span className="text-3xl font-black tabular-nums text-emerald-400">
                  {puntosDef}
                </span>
                <span className="text-lg font-black text-white ml-1">pts</span>
              </span>
              <span className="text-[10px] uppercase tracking-wide text-neutral-400 mt-1">
                empate/penales
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl font-black tabular-nums leading-none text-oro">
              {puntos}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-400 mt-1">
              puntos
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Cifra valor={promedio.toFixed(1)} etiqueta="pts/partido" />
          <Cifra valor={`${efectividad}%`} etiqueta="efectividad" />
        </div>

        {/* Barra de distribucion sobre el TOTAL jugado (incluye no pronosticados
            en gris al final, para que se note el hueco). */}
        {base > 0 && (
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-carbon-soft">
            {CATS.map((c) =>
              counts[c.key] > 0 ? (
                <div
                  key={c.key}
                  className={c.bar}
                  style={{ width: `${(counts[c.key] / base) * 100}%` }}
                  aria-hidden="true"
                />
              ) : null
            )}
            {noPron > 0 && (
              <div
                className="bg-neutral-600"
                style={{ width: `${(noPron / base) * 100}%` }}
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Leyenda con contadores por categoria (+ no pronosticados si hay) */}
        <div className={`mt-3 grid ${noPron > 0 ? "grid-cols-5" : "grid-cols-4"} gap-1 text-center`}>
          {CATS.map((c) => (
            <Conteo key={c.key} valor={counts[c.key]} label={c.label} dot={c.dot} text={c.text} />
          ))}
          {noPron > 0 && (
            <Conteo valor={noPron} label="Sin pron." dot="bg-neutral-500" text="text-neutral-300" />
          )}
        </div>

        {/* Pie: cuantos pronostico de los que ya se jugaron */}
        <div className="mt-3 pt-3 border-t border-borde/60 text-center text-[11px] text-neutral-500">
          {conPron} de {base} jugado{base === 1 ? "" : "s"} pronosticado{conPron === 1 ? "" : "s"}
          {noPron > 0 && <> · {noPron} sin apostar</>}
        </div>
      </div>
    </section>
  );
}

function Conteo({
  valor,
  label,
  dot,
  text,
}: {
  valor: number;
  label: string;
  dot: string;
  text: string;
}) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${text}`}>{valor}</div>
      <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </div>
    </div>
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
