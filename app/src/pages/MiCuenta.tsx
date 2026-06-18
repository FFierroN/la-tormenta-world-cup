import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { actualizarAlias, obtenerTabla } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import Avatar from "../components/Avatar";
import BotonCuenta from "../components/BotonCuenta";
import BotonEspeciales from "../components/BotonEspeciales";
import {
  AdminIcon,
  AliasIcon,
  ChevronIcon,
  PinIcon,
  PrediccionesIcon,
  ReglasIcon,
} from "../components/IconosCuenta";

export default function MiCuenta() {
  const navigate = useNavigate();
  const { jugador, entrar, salir } = useAuth();
  const [aliasAbierto, setAliasAbierto] = useState(false);

  // El avatar no viene en la sesion (login_jugador no lo devuelve), asi que lo
  // sacamos de la tabla de posiciones (grupo chico: 8 filas, barato).
  const { data: tabla } = useAsync(obtenerTabla, []);
  const miFila = (tabla ?? []).find((f) => f.jugador_id === jugador?.id) ?? null;
  const total = (tabla ?? []).length;

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

      {/* 1) Tarjeta del nombre, con avatar a la derecha */}
      <div className="bg-carbon-card border border-borde rounded-2xl p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold truncate">{jugador.nombre}</div>
          {jugador.alias && (
            <div className="text-sm text-neutral-400 truncate">alias: {jugador.alias}</div>
          )}
          {jugador.es_admin && (
            <span className="inline-block mt-2 text-xs font-semibold bg-oro text-carbon px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>
        <div className="shrink-0">
          <Avatar
            src={miFila ? avatarPorPosicion(miFila, total) : null}
            nombre={jugador.nombre}
            width={56}
            variante={miFila ? bordePorPosicion(miFila.posicion, total) : "gris"}
          />
        </div>
      </div>

      {/* 2) Tu alias (acordeon) */}
      <div className="mt-4">
        <BotonCuenta
          icon={<AliasIcon />}
          onClick={() => setAliasAbierto((v) => !v)}
          right={<ChevronIcon abierto={aliasAbierto} />}
          expandido={aliasAbierto}
        >
          Tu alias
        </BotonCuenta>
        {aliasAbierto && (
          <EditarAlias
            jugadorId={jugador.id}
            aliasActual={jugador.alias}
            onActualizado={(a) => entrar({ ...jugador, alias: a })}
          />
        )}
      </div>

      {/* 3) Cambiar PIN */}
      <BotonCuenta
        icon={<PinIcon />}
        onClick={() => navigate("/cambiar-pin")}
        className="mt-4"
      >
        Cambiar PIN
      </BotonCuenta>

      {/* 4) Reglas */}
      <BotonCuenta
        icon={<ReglasIcon />}
        onClick={() => navigate("/reglas")}
        className="mt-4"
      >
        Reglas
      </BotonCuenta>

      {/* 5) Mis predicciones */}
      <BotonCuenta
        icon={<PrediccionesIcon />}
        onClick={() => navigate("/mis-predicciones")}
        className="mt-4"
      >
        Mis predicciones
      </BotonCuenta>

      {/* 6) Realizar predicciones especiales (con pulso + cuenta regresiva) */}
      <BotonEspeciales className="mt-4" />

      {/* 7) Panel de admin (si corresponde) */}
      {jugador.es_admin && (
        <BotonCuenta
          icon={<AdminIcon />}
          onClick={() => navigate("/admin")}
          className="mt-4"
        >
          Panel de admin
        </BotonCuenta>
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

/* ---------- Editar alias (contenido del acordeon) ---------- */
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
    <div className="mt-2 bg-carbon-card border border-borde rounded-2xl p-4">
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
    </div>
  );
}
