import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarPartidos,
  prediccionesHabilitadas,
  setPrediccionesHabilitadas,
  fotoUltimoHabilitada,
  setFotoUltimoHabilitada,
  fotoPrimeroHabilitada,
  setFotoPrimeroHabilitada,
} from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { ESTADO_LABEL, enCurso } from "../lib/estados";
import { fmtFechaHora } from "../lib/fechas";
import ConfigToggle from "../components/ConfigToggle";

export default function Admin() {
  const navigate = useNavigate();
  const { data, cargando, error } = useAsync(listarPartidos, []);
  const [q, setQ] = useState("");

  // Orden del panel: primero los NO jugados (proximos arriba, fecha ascendente)
  // para acceso rapido; los ya jugados (estado 'final') caen al final en orden
  // descendente (el ultimo jugado primero). Asi no hay que scrollear el historial.
  const partidos = (data ?? [])
    .filter((p) => {
      const t = `${p.equipo_local} ${p.equipo_visita} ${p.fase} ${p.grupo ?? ""}`.toLowerCase();
      return t.includes(q.trim().toLowerCase());
    })
    .sort((a, b) => {
      const ja = a.estado === "final";
      const jb = b.estado === "final";
      if (ja !== jb) return ja ? 1 : -1; // no jugados primero
      if (!ja) return a.fecha.localeCompare(b.fecha); // proximos: ascendente
      return b.fecha.localeCompare(a.fecha); // jugados: descendente
    });

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Panel de admin</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Elige un partido para cargar resultado y eventos.
        </p>
      </header>

      <ConfigToggle
        titulo="Predicciones especiales"
        descripcionOn="Ventana ABIERTA: pueden editar."
        descripcionOff="Ventana cerrada."
        cargar={prediccionesHabilitadas}
        guardar={setPrediccionesHabilitadas}
      />

      <ConfigToggle
        titulo="Foto del último lugar"
        descripcionOn="Visible: el cuadro del último lleva foto de fondo."
        descripcionOff="Oculta: el cuadro del último se ve normal."
        cargar={fotoUltimoHabilitada}
        guardar={setFotoUltimoHabilitada}
      />

      <ConfigToggle
        titulo="Foto del primer lugar"
        descripcionOn="Visible: el cuadro del primero lleva foto de fondo."
        descripcionOff="Oculta: el cuadro del primero se ve normal."
        cargar={fotoPrimeroHabilitada}
        guardar={setFotoPrimeroHabilitada}
      />

      <div className="px-4 mb-3">
        <button
          onClick={() => navigate("/admin/especiales")}
          className="w-full bg-carbon-card border border-borde rounded-xl py-2.5 text-sm font-semibold active:bg-carbon-soft"
        >
          Cargar resultados especiales (fin del Mundial)
        </button>
      </div>

      <div className="px-4 mb-3">
        <button
          onClick={() => navigate("/admin/participantes")}
          className="w-full bg-carbon-card border border-borde rounded-xl py-2.5 text-sm font-semibold active:bg-carbon-soft"
        >
          Gestionar participantes (baja y ajuste de puntos)
        </button>
      </div>

      <div className="px-4 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar equipo, fase o grupo..."
          className="w-full px-4 py-2.5 rounded-full bg-carbon-soft border border-borde text-sm outline-none focus:border-oro"
        />
      </div>

      {cargando && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}
      {error && (
        <p className="px-4 text-red-400 text-sm">No se pudo cargar la lista.</p>
      )}

      <ul className="px-4 flex flex-col gap-2 pb-4">
        {partidos.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => navigate(`/admin/${p.id}`)}
              className="w-full text-left bg-carbon-card border border-borde rounded-xl px-4 py-3"
            >
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span>{fmtFechaHora(p.fecha)}</span>
                <span className={enCurso(p.estado) ? "text-oro font-semibold" : ""}>
                  {ESTADO_LABEL[p.estado]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {p.equipo_local} vs {p.equipo_visita}
                </span>
                <span className="text-base font-bold tabular-nums">
                  {p.goles_local ?? "-"} : {p.goles_visita ?? "-"}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
