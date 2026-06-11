import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { actualizarAlias, cambiarPin } from "../lib/data";
import Avatar from "../components/Avatar";
import type { Jugador } from "../lib/types";

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

      <MisAvatares jugador={jugador} />

      <button
        onClick={() => navigate("/especiales")}
        className="glow-oro mt-4 w-full bg-carbon-card border-2 border-oro rounded-2xl py-3 font-semibold text-oro active:bg-carbon-soft"
      >
        Mis predicciones especiales
      </button>

      <button
        onClick={() => navigate("/reglas")}
        className="mt-4 w-full bg-carbon-card border border-borde rounded-2xl py-3 font-semibold active:bg-carbon-soft"
      >
        Reglas
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

/* ---------- Mis avatares (privado: solo lo ve el propio usuario) ---------- */
function MisAvatares({ jugador }: { jugador: Jugador }) {
  const [abierto, setAbierto] = useState(false);
  const fotos = [
    { src: jugador.avatar_pos1, label: "1er lugar", variante: "oro" as const },
    { src: jugador.avatar_medio, label: "Puestos 2 a 7", variante: "gris" as const },
    { src: jugador.avatar_pos8, label: "Último lugar", variante: "rojo" as const },
  ];

  return (
    <section className="mt-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full bg-carbon-card border border-borde rounded-2xl py-3 font-semibold active:bg-carbon-soft flex items-center justify-center gap-2"
      >
        Avatares
        <span className={`transition-transform ${abierto ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="mt-3 bg-carbon-card border border-borde rounded-2xl p-4">
          <p className="text-xs text-neutral-400 mb-3 text-center">
            Tus 3 fotos según tu posición en la tabla. Solo tú las ves aquí.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {fotos.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 text-center">
                <Avatar src={f.src} nombre={jugador.nombre} width={88} variante={f.variante} />
                <span className="text-[11px] text-neutral-300 leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
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
