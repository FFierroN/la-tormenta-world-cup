import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_JUGADORES } from "../lib/mock";

// Login simple: elegir usuario + PIN. La validacion real ira contra Supabase.
export default function Login() {
  const navigate = useNavigate();
  const [jugador, setJugador] = useState("");
  const [pin, setPin] = useState("");

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: validar PIN contra Supabase (bcrypt). Por ahora solo navega.
    navigate("/partidos");
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      <img
        src="/logo.png"
        alt="La Tormenta World Cup"
        className="w-44 h-44 rounded-3xl shadow-xl shadow-black/50"
      />
      <p className="text-neutral-400 text-sm mt-3 mb-8">El prode de la World Cup</p>

      <form onSubmit={entrar} className="w-full flex flex-col gap-4">
        <label className="text-sm">
          <span className="text-neutral-300">Elige tu usuario</span>
          <select
            value={jugador}
            onChange={(e) => setJugador(e.target.value)}
            className="mt-1 w-full bg-carbon-card border border-borde rounded-xl px-3 py-3"
            required
          >
            <option value="">Selecciona...</option>
            {MOCK_JUGADORES.map((j) => (
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

        <button
          type="submit"
          className="mt-2 bg-oro text-carbon font-bold rounded-xl py-3 active:opacity-90"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
