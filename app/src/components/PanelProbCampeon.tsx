// Panel "Probabilidad de campeon de la quiniela" (Estadisticas).
// Corre una simulacion Monte Carlo (lib/probCampeon) sobre los 4 partidos que
// faltan y muestra el % que cada participante tiene de terminar 1o en la
// quiniela. Debajo, el sub-ranking de probabilidad del BOTIN DE ORO entre los
// 3 candidatos que estan en picks de participantes.
//
// El motor es puro; este componente solo se encarga de reunir los datos que
// necesita (tabla + especiales + estadisticas de gol + partidos) y pasar el
// resultado a una UI simple de barras.
import { useMemo } from "react";
import { useAsync } from "../lib/useAsync";
import {
  obtenerTabla,
  obtenerDesgloseTormenta,
  puntosEspeciales,
  todasEspeciales,
  obtenerEstadisticas,
  listarPartidos,
} from "../lib/data";
import {
  simularQuiniela,
  CANDIDATOS_GOLEADOR,
  FUERZA_EQUIPOS,
  norm,
  type ParticipanteSim,
  type CorredorGoleo,
} from "../lib/probCampeon";

// Semifinales cableadas aca (matchean con FUERZA_EQUIPOS en probCampeon.ts).
// Si cambian los cruces, se ajustan ambos archivos.
const SEMIS = { a: "Francia", b: "España", c: "Inglaterra", d: "Argentina" };

// Codigos ISO de los semifinalistas: se usan para saber si el LIDER actual de
// goles esta vivo (semifinalista) o congelado (equipo eliminado -> ya no marca).
const ISO_SEMIS = new Set(["fr", "es", "gb-eng", "ar"]);

// Cuantos top-goleadores actuales miramos por si alguno no-semifinalista tiene
// tantos goles que podria ganar el botin igual (congelado). Con 6 basta.
const TOP_LIDERES = 6;

interface DatosSim {
  participantes: ParticipanteSim[];
  corredores: CorredorGoleo[];
}

// Carga todo lo que necesita el motor en paralelo y arma las estructuras.
async function reunirDatos(): Promise<DatosSim> {
  const [tabla, desglose, pEsp, todasEsp, stats, partidos] = await Promise.all([
    obtenerTabla(),
    obtenerDesgloseTormenta(),
    puntosEspeciales(),
    todasEspeciales(),
    obtenerEstadisticas(),
    listarPartidos(),
  ]);

  // no_pronosticados por jugador (para el desempate real).
  const sinPronPorId = new Map<string, number>();
  for (const d of desglose) sinPronPorId.set(d.jugador_id, d.no_pronosticados);

  // Picks por jugador (para pais/goleador).
  const picksPorId = new Map<string, (typeof todasEsp)[number]>();
  for (const e of todasEsp) picksPorId.set(e.jugador_id, e);

  const participantes: ParticipanteSim[] = tabla.map((f) => {
    const pe = pEsp.get(f.jugador_id);
    // Restamos pais + goleador (variables), dejamos asistidor + distinciones fijos.
    const baseEstable =
      f.puntos - (pe?.puntos_pais ?? 0) - (pe?.puntos_goleador ?? 0);
    const picks = picksPorId.get(f.jugador_id);
    return {
      id: f.jugador_id,
      nombre: f.alias ?? f.nombre,
      baseEstable,
      exactos: f.exactos,
      aciertos: f.aciertos,
      fallas: f.fallas,
      sinPron: sinPronPorId.get(f.jugador_id) ?? 0,
      picksPais: [
        picks?.campeon ?? null,
        picks?.finalista_1 ?? null,
        picks?.finalista_2 ?? null,
        picks?.semifinalista_1 ?? null,
        picks?.semifinalista_2 ?? null,
        picks?.semifinalista_3 ?? null,
        picks?.semifinalista_4 ?? null,
      ],
      pickGoleador: picks?.goleador ?? null,
    };
  });

  // Corredores del botin.
  // 1) Los 3 candidatos oficiales (Messi/Mbappe/Kane) con rate real.
  //    Sus equipos son semifinalistas -> juegan 2 partidos mas seguro.
  const golePorNombre = new Map<string, number>();
  for (const g of stats.goleadores) golePorNombre.set(norm(g.jugador), g.total);

  // Partidos jugados por equipo (para calcular rate = goles / PJ).
  const pjEquipo = new Map<string, number>();
  for (const p of partidos) {
    if (p.estado !== "final") continue;
    for (const eq of [p.equipo_local, p.equipo_visita]) {
      const n = norm(eq);
      if (!n || n === "por definir") continue;
      pjEquipo.set(n, (pjEquipo.get(n) ?? 0) + 1);
    }
  }
  const pjDeAlias = (alias: string[]): number => {
    for (const a of alias) if (pjEquipo.has(a)) return pjEquipo.get(a)!;
    return 6; // fallback tipico para semifinalistas (3 grupo + R32+R16+QF)
  };

  const corredores: CorredorGoleo[] = [];
  const yaAgregado = new Set<string>();
  for (const c of CANDIDATOS_GOLEADOR) {
    let goles = 0;
    for (const a of c.alias) {
      if (golePorNombre.has(a)) {
        goles = golePorNombre.get(a)!;
        break;
      }
    }
    const pj = pjDeAlias(c.equipoAlias);
    const rate = pj > 0 ? goles / pj : 0;
    corredores.push({ nombre: c.nombre, goles, rate });
    for (const a of c.alias) yaAgregado.add(a);
  }

  // 2) Lideres actuales cuyo equipo NO es semifinalista -> congelados (rate=0).
  //    Si alguno tiene mas goles que los candidatos, puede ganar el botin y
  //    dejar a los 3 picks sin puntos (realista).
  const topGoles = stats.goleadores.slice(0, TOP_LIDERES);
  for (const g of topGoles) {
    const n = norm(g.jugador);
    if (yaAgregado.has(n)) continue;
    const paisIso = (g.pais ?? "").toLowerCase();
    if (ISO_SEMIS.has(paisIso)) continue; // sigue vivo pero no lo simulamos
    corredores.push({ nombre: g.jugador, goles: g.total, rate: 0 });
    yaAgregado.add(n);
  }

  return { participantes, corredores };
}

export default function PanelProbCampeon() {
  const { data, cargando, error } = useAsync(reunirDatos, []);

  // useMemo para no re-simular en cada render (10k iteraciones son ~milisegundos
  // igual, pero si el usuario cambia de pestana y vuelve, se cachea aca).
  const sim = useMemo(() => {
    if (!data) return null;
    return simularQuiniela({
      participantes: data.participantes,
      semis: SEMIS,
      corredores: data.corredores,
      iteraciones: 10000,
    });
  }, [data]);

  if (cargando) {
    return <Contenedor><p className="text-neutral-400 text-sm">Simulando escenarios...</p></Contenedor>;
  }
  if (error) {
    return <Contenedor><p className="text-red-400 text-sm">No se pudo simular: {error}</p></Contenedor>;
  }
  if (!sim || !data) return null;

  const max = Math.max(...sim.quiniela.map((f) => f.prob), 0.001);

  return (
    <Contenedor>
      <div className="mb-2">
        <h3 className="text-sm font-bold text-oro">Probabilidad de campeon de la quiniela</h3>
        <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">
          Simulacion Monte Carlo ({sim.iteraciones.toLocaleString()} escenarios) de los 4 partidos
          que faltan. Fuerza: {FUERZA_EQUIPOS.map((f) => `${f.alias[0]} ${f.fuerza}%`).join(" · ")}.
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {sim.quiniela.map((f, i) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-right tabular-nums text-neutral-500 text-[11px]">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate">{f.nombre}</span>
            <div className="w-24 h-2 bg-carbon-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(f.prob / max) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right tabular-nums font-bold text-emerald-400">
              {(f.prob * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>

      {/* Sub-panel: botin de oro */}
      <div className="mt-4 pt-3 border-t border-borde">
        <h4 className="text-xs font-bold text-oro mb-1.5">Probabilidad de botin de oro</h4>
        <ul className="flex flex-col gap-1">
          {sim.goleador.map((g) => (
            <li key={g.nombre} className="flex items-center gap-2 text-xs">
              <span className="flex-1 min-w-0 truncate">{g.nombre}</span>
              <div className="w-20 h-1.5 bg-carbon-soft rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${g.prob * 100}%` }} />
              </div>
              <span className="w-10 text-right tabular-nums text-amber-400 font-semibold">
                {(g.prob * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-neutral-500 mt-1.5 leading-tight">
          Ritmo estimado desde sus goles y partidos jugados. Los lideres cuyo equipo quedo fuera
          estan congelados: si alguno ya tiene mas goles, puede ganar el botin igual.
        </p>
      </div>
    </Contenedor>
  );
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-carbon-card border border-borde rounded-xl p-3">
      {children}
    </div>
  );
}
