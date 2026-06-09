import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import { listarJugadores, loginJugador } from "../lib/data";

// Login: elegir usuario + PIN. Valida contra Supabase via RPC (login_jugador).
export default function Login() {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const { data: jugadores, cargando, error } = useAsync(listarJugadores, []);

  const [jugadorId, setJugadorId] = useState("");
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    setEnviando(true);
    try {
      const j = await loginJugador(jugadorId, pin);
      if (!j) {
        setAviso("PIN incorrecto. Intenta de nuevo.");
        return;
      }
      entrar(j);
      navigate("/partidos");
    } catch {
      setAviso("No pudimos conectar. Revisa tu conexion e intenta otra vez.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <img
        src="/logo.png"
        alt="La Tormenta World Cup"
        className="w-44 h-44 rounded-3xl shadow-xl shadow-black/50"
      />
      <p className="text-neutral-400 text-sm mt-3 mb-8">El prode de la World Cup</p>

      <form onSubmit={submit} className="w-full flex flex-col gap-4">
        <label className="text-sm">
          <span className="text-neutral-300">Elige tu usuario</span>
          <select
            value={jugadorId}
            onChange={(e) => setJugadorId(e.target.value)}
            className="mt-1 w-full bg-carbon-card border border-borde rounded-xl px-3 py-3 disabled:opacity-50"
            required
            disabled={cargando || !!error}
          >
            <option value="">
              {cargando ? "Cargando..." : "Selecciona..."}
            </option>
            {(jugadores ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.alias ?? j.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-neutral-300">PIN</span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1 w-full bg-carbon-card border border-borde rounded-xl px-3 py-3 tracking-widest"
            placeholder="****"
            required
          />
        </label>

        {error && (
          <p className="text-sm text-red-400">
            No se pudo cargar la lista de jugadores. Falta configurar Supabase
            (.env) o no hay conexion.
          </p>
        )}
        {aviso && <p className="text-sm text-red-400">{aviso}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 bg-oro text-carbon font-bold rounded-xl py-3 active:opacity-90 disabled:opacity-60"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
