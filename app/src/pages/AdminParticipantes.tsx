import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarJugadoresAdmin, setAjustePuntos, setJugadorActivo } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import type { JugadorAdmin } from "../lib/types";

export default function AdminParticipantes() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const { data, cargando, error } = useAsync(listarJugadoresAdmin, [version]);

  const refrescar = () => setVersion((v) => v + 1);
  const jugadores = data ?? [];

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold">Participantes</h1>
          <p className="text-xs text-neutral-400">
            Dar de baja y ajustar puntos manualmente.
          </p>
        </div>
      </header>

      <div className="px-4">
        <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
          El <span className="text-oro">ajuste</span> se SUMA al total en la tabla
          (puede ser negativo) y no pisa los puntos ganados. Un jugador{" "}
          <span className="text-oro">dado de baja</span> no puede entrar ni aparece
          en la tabla ni en la galeria de avatares.
        </p>
      </div>

      {cargando && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}
      {error && (
        <p className="px-4 text-red-400 text-sm">No se pudo cargar la lista.</p>
      )}

      <ul className="px-4 flex flex-col gap-3">
        {jugadores.map((j) => (
          <FichaParticipante key={j.id} jugador={j} onCambio={refrescar} />
        ))}
      </ul>
    </div>
  );
}

function FichaParticipante({
  jugador,
  onCambio,
}: {
  jugador: JugadorAdmin;
  onCambio: () => void;
}) {
  const [ajuste, setAjuste] = useState(String(jugador.ajuste_puntos));
  const [motivo, setMotivo] = useState(jugador.ajuste_motivo ?? "");
  const [guardando, setGuardando] = useState(false);
  const [cambiandoActivo, setCambiandoActivo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const guardarAjuste = async () => {
    const n = parseInt(ajuste, 10);
    if (Number.isNaN(n)) {
      setMsg("El ajuste debe ser un numero (puede ser negativo).");
      return;
    }
    setGuardando(true);
    setMsg(null);
    try {
      await setAjustePuntos(jugador.id, n, motivo);
      setMsg("Ajuste guardado.");
      onCambio();
    } catch {
      setMsg("No se pudo guardar el ajuste.");
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async () => {
    setCambiandoActivo(true);
    setMsg(null);
    try {
      await setJugadorActivo(jugador.id, !jugador.activo);
      onCambio();
    } catch {
      setMsg("No se pudo cambiar el estado.");
    } finally {
      setCambiandoActivo(false);
    }
  };

  return (
    <li
      className={`bg-carbon-card border rounded-2xl p-4 ${
        jugador.activo ? "border-borde" : "border-red-500/40 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            {jugador.nombre}
            {jugador.es_admin && (
              <span className="text-[10px] font-semibold bg-oro text-carbon px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
          {jugador.alias && (
            <div className="text-xs text-neutral-400">alias: {jugador.alias}</div>
          )}
          {!jugador.activo && (
            <div className="text-xs text-red-400 font-semibold mt-0.5">
              Dado de baja
            </div>
          )}
        </div>
        <button
          onClick={alternarActivo}
          disabled={cambiandoActivo || jugador.es_admin}
          title={jugador.es_admin ? "No puedes darte de baja a ti mismo" : ""}
          className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors disabled:opacity-40 ${
            jugador.activo
              ? "border-red-500/50 text-red-400 active:bg-red-500/10"
              : "border-emerald-500/50 text-emerald-400 active:bg-emerald-500/10"
          }`}
        >
          {cambiandoActivo
            ? "..."
            : jugador.activo
            ? "Dar de baja"
            : "Re-activar"}
        </button>
      </div>

      <div className="mt-3 border-t border-borde pt-3">
        <label className="text-xs font-semibold text-oro uppercase tracking-wide">
          Ajuste de puntos
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            className="w-24 px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm tabular-nums"
          />
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            maxLength={80}
            className="flex-1 px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
          />
        </div>
        <button
          onClick={guardarAjuste}
          disabled={guardando}
          className="mt-3 w-full py-2 rounded-full bg-oro text-carbon font-bold text-sm disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar ajuste"}
        </button>
        {msg && (
          <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>
        )}
      </div>
    </li>
  );
}
