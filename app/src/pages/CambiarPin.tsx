import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cambiarPin } from "../lib/data";

// Pantalla dedicada para cambiar el PIN (antes vivia dentro de Mi cuenta).
export default function CambiarPin() {
  const navigate = useNavigate();
  const { jugador } = useAuth();

  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [confirma, setConfirma] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!jugador) return null;

  const valido = /^\d{4}$/.test(nuevo) && nuevo === confirma;

  const guardar = async () => {
    if (!valido) {
      setMsg("El nuevo PIN debe tener 4 digitos y coincidir.");
      setOk(false);
      return;
    }
    setGuardando(true);
    setMsg(null);
    try {
      const cambio = await cambiarPin(jugador.id, actual, nuevo);
      if (cambio) {
        setMsg("PIN cambiado.");
        setOk(true);
        setActual("");
        setNuevo("");
        setConfirma("");
      } else {
        setMsg("El PIN actual es incorrecto.");
        setOk(false);
      }
    } catch {
      setMsg("No se pudo cambiar el PIN.");
      setOk(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Cambiar PIN</h1>
      </header>

      <section className="px-4">
        <div className="bg-carbon-card border border-borde rounded-2xl p-4">
          <p className="text-sm text-neutral-300 mb-3">
            Tu PIN son 4 digitos y lo usas para entrar a La Tormenta.
          </p>
          <div className="flex flex-col gap-2">
            <PinInput valor={actual} set={setActual} ph="PIN actual" />
            <PinInput valor={nuevo} set={setNuevo} ph="PIN nuevo (4 digitos)" />
            <PinInput valor={confirma} set={setConfirma} ph="Repetir PIN nuevo" />
          </div>
          <button
            onClick={guardar}
            disabled={guardando}
            className="mt-3 w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Cambiar PIN"}
          </button>
          {msg && (
            <p
              className={`mt-2 text-center text-xs ${
                ok ? "text-green-400" : "text-rose-400"
              }`}
            >
              {msg}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function PinInput({
  valor,
  set,
  ph,
}: {
  valor: string;
  set: (v: string) => void;
  ph: string;
}) {
  return (
    <input
      type="password"
      inputMode="numeric"
      maxLength={4}
      value={valor}
      onChange={(e) => set(e.target.value.replace(/\D/g, ""))}
      placeholder={ph}
      className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm tracking-widest"
    />
  );
}
