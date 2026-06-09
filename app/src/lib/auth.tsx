// Sesion del jugador. Como NO usamos Supabase Auth (login propio por PIN via
// RPC), guardamos al jugador logueado en localStorage y lo exponemos por
// contexto. Simple y suficiente para un grupo cerrado de 8.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Jugador } from "./types";

const CLAVE = "tormenta_jugador";

type AuthCtx = {
  jugador: Jugador | null;
  entrar: (j: Jugador) => void;
  salir: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function leerSesion(): Jugador | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Jugador) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [jugador, setJugador] = useState<Jugador | null>(() => leerSesion());

  useEffect(() => {
    if (jugador) localStorage.setItem(CLAVE, JSON.stringify(jugador));
    else localStorage.removeItem(CLAVE);
  }, [jugador]);

  const value = useMemo<AuthCtx>(
    () => ({
      jugador,
      entrar: (j) => setJugador(j),
      salir: () => setJugador(null),
    }),
    [jugador]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
