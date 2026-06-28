import { useNavigate } from "react-router-dom";
import { PUNTOS_DEFINICION, PUNTOS_DISTINCION, PUNTOS_PAIS, PUNTOS_PARTIDO } from "../lib/reglas";

export default function Reglas() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Reglas</h1>
      </header>

      <div className="px-4 flex flex-col gap-5">
        {/* Como se puntua un partido */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Por cada partido
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Predices el marcador de cada partido (resultado a los 90'). Ganas
            puntos segun que tan bien le achuntas. La tarifa es la misma en toda
            la copa:
          </p>
          <ul className="text-sm text-neutral-300 space-y-1 mb-3">
            <li>
              <span className="text-oro font-semibold">Exacto:</span> achuntas el
              marcador clavado. Vale mas si <b>pocos</b> lo clavaron:{" "}
              <span className="text-oro">unico</span> (solo tu),{" "}
              <span className="text-oro">x2</span> (otra persona tambien) o{" "}
              <span className="text-oro">x3+</span> (tres o mas).
            </li>
            <li>
              <span className="text-sky-400 font-semibold">Diferencia:</span>{" "}
              achuntas la diferencia de goles (sin empate), pero no el marcador.
              Ej: fue 3-1 y dijiste 2-0.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">Acierto:</span>{" "}
              achuntas solo el resultado (ganador o empate).
            </li>
            <li>
              <span className="text-neutral-400 font-semibold">Falla:</span> no
              achuntas ni el resultado. 0 puntos.
            </li>
          </ul>
          <p className="text-xs text-neutral-500 mb-3">
            En partidos que terminan en <b>empate</b> no existe “Diferencia”: solo
            Exacto (con sus tiers) o Acierto.
          </p>

          <div className="overflow-hidden rounded-xl border border-borde">
            <table className="w-full text-xs">
              <thead className="bg-carbon-soft text-neutral-400 uppercase">
                <tr>
                  <th className="py-2 px-1.5 text-left">Fase</th>
                  <th className="py-2 px-1 text-center">Unic</th>
                  <th className="py-2 px-1 text-center">x2</th>
                  <th className="py-2 px-1 text-center">x3+</th>
                  <th className="py-2 px-1 text-center">Dif</th>
                  <th className="py-2 px-1 text-center">Ac</th>
                </tr>
              </thead>
              <tbody>
                {PUNTOS_PARTIDO.map((f) => (
                  <tr key={f.fase} className="border-t border-borde">
                    <td className="py-2 px-1.5">{f.fase}</td>
                    <td className="py-2 px-1 text-center font-bold text-oro tabular-nums">
                      {f.unico}
                    </td>
                    <td className="py-2 px-1 text-center font-bold text-oro/80 tabular-nums">
                      {f.x2}
                    </td>
                    <td className="py-2 px-1 text-center font-bold text-oro/60 tabular-nums">
                      {f.x3}
                    </td>
                    <td className="py-2 px-1 text-center font-bold text-sky-400 tabular-nums">
                      {f.diferencia}
                    </td>
                    <td className="py-2 px-1 text-center font-bold tabular-nums">
                      {f.acierto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Definicion del empate (eliminatoria) */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Si hay empate (fase final)
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Solo en eliminatoria. Ademas del marcador, predices como se define un
            empate: <b>Alargue</b> o <b>Penales</b> (eliges uno; el otro se
            bloquea), y pones el marcador de esa instancia. Es una apuesta
            <b> extra y opcional</b>: solo suma si el partido <b>realmente</b> se
            va a esa definicion.
          </p>
          <ul className="space-y-1.5">
            {PUNTOS_DEFINICION.map((e) => (
              <li
                key={e.item}
                className="flex items-center justify-between text-sm bg-carbon-soft rounded-lg px-3 py-2"
              >
                <span className="text-neutral-300">{e.item}</span>
                <span className="font-bold text-oro tabular-nums">+{e.pts} pts</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 mt-3">
            El marcador del alargue cuenta <b>solo</b> los goles del tiempo extra;
            el de penales, la tanda. Si el partido se resuelve en los 90', esta
            apuesta no suma ni resta.
          </p>
        </section>

        {/* Predicciones especiales */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Predicciones especiales
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Antes de que arranque el Mundial eliges tus apuestas grandes. Hay dos
            tipos y se suman al final del torneo:
          </p>

          <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide mb-1">
            Pais
          </h3>
          <p className="text-xs text-neutral-400 mb-2">
            Eliges Campeon, 2 finalistas y 4 semifinalistas. Por cada equipo
            cobras <b>solo la ronda mas alta que realmente logro</b> (un mismo
            equipo no paga dos veces).
          </p>
          <ul className="space-y-1.5 mb-4">
            {PUNTOS_PAIS.map((e) => (
              <li
                key={e.item}
                className="flex items-center justify-between text-sm bg-carbon-soft rounded-lg px-3 py-2"
              >
                <span className="text-neutral-300">{e.item}</span>
                <span className="font-bold text-oro tabular-nums">{e.pts} pts</span>
              </li>
            ))}
          </ul>

          <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide mb-1">
            Distincion
          </h3>
          <p className="text-xs text-neutral-400 mb-2">
            Premios individuales. Cada uno suma por separado.
          </p>
          <ul className="space-y-1.5">
            {PUNTOS_DISTINCION.map((e) => (
              <li
                key={e.item}
                className="flex items-center justify-between text-sm bg-carbon-soft rounded-lg px-3 py-2"
              >
                <span className="text-neutral-300">{e.item}</span>
                <span className="font-bold text-oro tabular-nums">{e.pts} pts</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Politica de desempate */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Desempate
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            <b>Nunca</b> puede haber dos participantes en la misma posicion. Si
            dos o mas quedan con los <b>mismos puntos</b>, se ordenan asi, en
            cascada (si el primer criterio empata, se pasa al siguiente):
          </p>
          <ol className="text-sm text-neutral-300 space-y-2">
            <li className="flex gap-3 bg-carbon-soft rounded-lg px-3 py-2">
              <span className="font-bold text-oro">1</span>
              <span>
                Mas <span className="text-oro font-semibold">marcadores exactos</span>.
              </span>
            </li>
            <li className="flex gap-3 bg-carbon-soft rounded-lg px-3 py-2">
              <span className="font-bold text-oro">2</span>
              <span>
                Mas <span className="text-emerald-400 font-semibold">aciertos</span>{" "}
                (diferencia + resultado).
              </span>
            </li>
            <li className="flex gap-3 bg-carbon-soft rounded-lg px-3 py-2">
              <span className="font-bold text-oro">3</span>
              <span>
                Menos <span className="text-neutral-400 font-semibold">fallas</span>.
              </span>
            </li>
            <li className="flex gap-3 bg-carbon-soft rounded-lg px-3 py-2">
              <span className="font-bold text-oro">4</span>
              <span>
                Si todo lo anterior es identico, decide el{" "}
                <span className="font-semibold">orden de inscripcion</span>.
              </span>
            </li>
          </ol>
          <p className="text-xs text-neutral-500 mt-3">
            Antes del primer partido todos estan en 0 y quedan por orden de
            inscripcion; el desempate real empieza a notarse con los resultados.
          </p>
        </section>

        <p className="text-xs text-neutral-500 text-center">
          El que mas puntos sume al final, gana. Que gane el mejor.
        </p>
      </div>
    </div>
  );
}
