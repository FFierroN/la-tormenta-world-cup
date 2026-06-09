import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { actualizarAlias, cambiarPin } from "../lib/data";

export default function MiCuenta() {
  const navigate = useNavigate();
  const { jugador, entrar, salir } = useAuth();

  const cerrar = () => {
    salir();
    navigate("/login");
  };

  if (!jugador) return null;

  return (
    <div className="max-w-md mx-auto px-4 pb-10">
      <header className="pt-5 pb-3">
        <h1 className="text-xl font-bold">Mi cuenta</h1>
      </header>

      <div className="bg-carbon-card border border-borde rounded-2xl p-4">
        <div className="text-lg font-bold">{jugador.nombre}</div>
        {jugador.alias && (
          <div className="text-sm text-neutral-400">alias: {jugador.alias}</div>
        )}
        {jugador.es_admin && (
          <span className="inline-block mt-2 text-xs font-semibold bg-oro text-carbon px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>

      <EditarAlias
        jugadorId={jugador.id}
        aliasActual={jugador.alias}
        onActualizado={(a) => entrar({ ...jugador, alias: a })}
      />

      <CambiarPin jugadorId={jugador.id} />

      <button
        onClick={() => navigate("/especiales")}
        className="mt-4 w-full bg-carbon-card border border-borde rounded-2xl py-3 font-semibold active:bg-carbon-soft"
      >
        Mis predicciones especiales
      </button>

      {jugador.es_admin && (
        <button
          onClick={() => navigate("/admin")}
          className="mt-4 w-full bg-oro text-carbon font-bold rounded-2xl py-3 active:scale-[0.99] transition-transform"
        >
          Panel de admin
        </button>
      )}

      <button
        onClick={cerrar}
        className="mt-6 w-full border border-borde rounded-xl py-3 text-neutral-300 active:bg-carbon-soft"
      >
        Cerrar sesion
      </button>
    </div>
  );
}

/* ---------- Editar alias ---------- */
function EditarAlias({
  jugadorId,
  aliasActual,
  onActualizado,
}: {
  jugadorId: string;
  aliasActual: string | null;
  onActualizado: (alias: string | null) => void;
}) {
  const [alias, setAlias] = useState(aliasActual ?? "");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await actualizarAlias(jugadorId, alias);
      const limpio = alias.trim() || null;
      onActualizado(limpio);
      setMsg("Alias actualizado.");
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mt-4 bg-carbon-card border border-borde rounded-2xl p-4">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-3">
        Tu alias
      </h2>
      <input
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Como quieres que te vean"
        maxLength={24}
        className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="mt-3 w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar alias"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>}
    </section>
  );
}

/* ---------- Cambiar PIN ---------- */
function CambiarPin({ jugadorId }: { jugadorId: string }) {
  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [confirma, setConfirma] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valido = /^\d{4}$/.test(nuevo) && nuevo === confirma;

  const guardar = async () => {
    if (!valido) {
      setMsg("El nuevo PIN debe tener 4 digitos y coincidir.");
      return;
    }
    setGuardando(true);
    setMsg(null);
    try {
      const ok = await cambiarPin(jugadorId, actual, nuevo);
      if (ok) {
        setMsg("PIN cambiado.");
        setActual("");
        setNuevo("");
        setConfirma("");
      } else {
        setMsg("El PIN actual es incorrecto.");
      }
    } catch {
      setMsg("No se pudo cambiar el PIN.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mt-4 bg-carbon-card border border-borde rounded-2xl p-4">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-3">
        Cambiar PIN
      </h2>
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
      {msg && <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>}
    </section>
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
