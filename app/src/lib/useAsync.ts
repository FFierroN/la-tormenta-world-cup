// Hook generico para cargar datos async con estados de carga/error.
// Evita repetir el mismo useEffect+useState en cada pantalla (DRY).
import { useEffect, useState } from "react";

type Estado<T> = {
  data: T | null;
  cargando: boolean;
  error: string | null;
};

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({
    data: null,
    cargando: true,
    error: null,
  });

  useEffect(() => {
    let vivo = true;
    setEstado({ data: null, cargando: true, error: null });
    fn()
      .then((data) => vivo && setEstado({ data, cargando: false, error: null }))
      .catch((e) =>
        vivo &&
        setEstado({
          data: null,
          cargando: false,
          error: e?.message ?? "Error al cargar",
        })
      );
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return estado;
}
