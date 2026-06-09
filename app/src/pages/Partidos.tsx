import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Flag from "../components/Flag";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { ESTADO_LABEL, enCurso } from "../lib/estados";
import { fmtFechaHora } from "../lib/fechas";
import type { Partido } from "../lib/types";

// Orden de las fases de eliminacion (para mostrarlas en secuencia).
const ORDEN_FASE = [
  "Dieciseisavos",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer Puesto",
  "Final",
];

type Seccion = { titulo: string; grupo: string | null; partidos: Partido[] };

function organizar(partidos: Partido[]): Seccion[] {
  const grupos = partidos.filter((p) => p.grupo);
  const llaves = partidos.filter((p) => !p.grupo);
  const secciones: Seccion[] = [];

  // Fase de grupos: una seccion (plegable) por grupo (A..L).
  const letras = [...new Set(grupos.map((p) => p.grupo as string))].sort();
  for (const letra of letras) {
    secciones.push({
      titulo: `Grupo ${letra}`,
      grupo: letra,
      partidos: grupos
        .filter((p) => p.grupo === letra)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    });
  }

  // Eliminatorias: una seccion fija por fase, en orden.
  const fases = [...new Set(llaves.map((p) => p.fase))].sort(
    (a, b) => ORDEN_FASE.indexOf(a) - ORDEN_FASE.indexOf(b)
  );
  for (const fase of fases) {
    secciones.push({
      titulo: fase,
      grupo: null,
      partidos: llaves
        .filter((p) => p.fase === fase)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    });
  }

  return secciones;
}

export default function Partidos() {
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const secciones = partidos ? organizar(partidos) : [];

  // Acordeon: que grupos estan abiertos. Por defecto, TODOS.
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const toggle = (letra: string) =>
    setCerrados((prev) => {
      const next = new Set(prev);
      next.has(letra) ? next.delete(letra) : next.add(letra);
      return next;
    });

  // Si venimos desde Grupos con ?grupo=A, abrimos y hacemos scroll a ese grupo.
  const [params] = useSearchParams();
  const objetivo = params.get("grupo");
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!objetivo || !partidos) return;
    setCerrados((prev) => {
      const next = new Set(prev);
      next.delete(objetivo);
      return next;
    });
    const t = setTimeout(() => {
      refs.current[objetivo]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [objetivo, partidos]);

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Partidos</h1>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando partidos...</p>
      )}
      {error && (
        <p className="px-4 text-red-400 text-sm">
          No se pudieron cargar los partidos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && secciones.length === 0 && (
        <p className="px-4 text-neutral-400 text-sm">Aun no hay partidos.</p>
      )}

      <div className="flex flex-col gap-5 pb-2">
        {secciones.map((s) => {
          const plegable = s.grupo !== null;
          const abierto = !plegable || !cerrados.has(s.grupo as string);
          return (
            <section
              key={s.titulo}
              ref={(el) => {
                if (s.grupo) refs.current[s.grupo] = el;
              }}
              className="scroll-mt-4"
            >
              {plegable ? (
                <button
                  onClick={() => toggle(s.grupo as string)}
                  className="w-full px-4 mb-2 flex items-center justify-between"
                >
                  <span className="text-sm font-bold text-oro uppercase tracking-wide">
                    {s.titulo}
                  </span>
                  <Chevron abierto={abierto} />
                </button>
              ) : (
                <h2 className="px-4 mb-2 text-sm font-bold text-oro uppercase tracking-wide">
                  {s.titulo}
                </h2>
              )}

              {abierto && (
                <ul className="px-4 flex flex-col gap-3">
                  {s.partidos.map((p) => (
                    <PartidoCard key={p.id} p={p} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PartidoCard({ p }: { p: Partido }) {
  const navigate = useNavigate();
  return (
    <li>
      <button
        onClick={() => navigate(`/partido/${p.id}`)}
        className="w-full text-left bg-carbon-card border border-borde rounded-2xl p-4 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
          <span>{fmtFechaHora(p.fecha)}</span>
          <span
            className={
              enCurso(p.estado) ? "text-oro font-semibold" : "text-neutral-400"
            }
          >
            {ESTADO_LABEL[p.estado]}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Equipo code={p.pais_local} nombre={p.equipo_local} />
          <Marcador p={p} />
          <Equipo code={p.pais_visita} nombre={p.equipo_visita} />
        </div>
      </button>
    </li>
  );
}

function Equipo({ code, nombre }: { code: string; nombre: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      <Flag code={code} size={44} nombre={nombre} />
      <span className="text-xs text-center font-medium leading-tight">{nombre}</span>
    </div>
  );
}

function Marcador({ p }: { p: Partido }) {
  if (p.estado === "programado") {
    return <div className="text-sm font-semibold text-neutral-500">VS</div>;
  }
  return (
    <div className="text-2xl font-black tabular-nums">
      {p.goles_local ?? 0} - {p.goles_visita ?? 0}
    </div>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-neutral-400 transition-transform ${
        abierto ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
