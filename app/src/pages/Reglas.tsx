import { useNavigate } from "react-router-dom";
import { BONUS, PUNTOS_ESPECIALES, PUNTOS_PARTIDO } from "../lib/reglas";

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
        <h1 className="text-lg font-bold">Reglas de puntuacion</h1>
      </header>

      <div className="px-4 flex flex-col gap-5">
        {/* Como se puntua un partido */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Por cada partido
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Predices el marcador de cada partido. Ganas puntos segun que tan bien
            le achuntas (y vale mas mientras mas avanza el Mundial):
          </p>
          <ul className="text-sm text-neutral-300 space-y-1 mb-3">
            <li>
              <span className="text-oro font-semibold">Exacto:</span> achuntas el
              marcador clavado.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">Acierto:</span>{" "}
              achuntas el resultado (ganador o empate) pero no el marcador.
            </li>
            <li>
              <span className="text-neutral-400 font-semibold">Falla:</span> no
              achuntas ni el resultado. 0 puntos.
            </li>
          </ul>

          <div className="overflow-hidden rounded-xl border border-borde">
            <table className="w-full text-sm">
              <thead className="bg-carbon-soft text-neutral-400 text-xs uppercase">
                <tr>
                  <th className="py-2 px-3 text-left">Fase</th>
                  <th className="py-2 px-2 text-center">Exacto</th>
                  <th className="py-2 px-2 text-center">Acierto</th>
                </tr>
              </thead>
              <tbody>
                {PUNTOS_PARTIDO.map((f) => (
                  <tr key={f.fase} className="border-t border-borde">
                    <td className="py-2 px-3">{f.fase}</td>
                    <td className="py-2 px-2 text-center font-bold text-oro tabular-nums">
                      {f.exacto}
                    </td>
                    <td className="py-2 px-2 text-center font-bold tabular-nums">
                      {f.acierto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bonus por riesgo */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Bonus por riesgo
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Solo si achuntas el marcador <b>exacto</b>, sumas puntos extra por
            atreverte con partidos de muchos goles:
          </p>
          <ul className="space-y-1.5">
            {BONUS.map((b) => (
              <li
                key={b.pts}
                className="flex items-center gap-3 text-sm bg-carbon-soft rounded-lg px-3 py-2"
              >
                <span className="font-bold text-oro w-8 tabular-nums">{b.pts}</span>
                <span className="text-neutral-300">{b.ejemplo}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Predicciones especiales */}
        <section className="bg-carbon-card border border-borde rounded-2xl p-4">
          <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-2">
            Predicciones especiales
          </h2>
          <p className="text-sm text-neutral-300 mb-3">
            Antes de que arranque el Mundial eliges tus apuestas grandes. Cada
            acierto suma al final del torneo:
          </p>
          <ul className="space-y-1.5">
            {PUNTOS_ESPECIALES.map((e) => (
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

        <p className="text-xs text-neutral-500 text-center">
          El que mas puntos sume al final, gana. Que gane el mejor.
        </p>
      </div>
    </div>
  );
}
