// Restaura la posicion de scroll de una pagina (lista) al volver de un detalle.
// Patron: al hacer click en un item se llama guardarScroll(key) ANTES de
// navegar; al volver, useScrollRestore(key, listo) repone la posicion cuando el
// contenido ya esta renderizado (listo = datos cargados). Se limpia tras usar,
// asi solo restaura en el regreso inmediato (no al entrar fresco desde el menu).
import { useEffect } from "react";

export function guardarScroll(key: string): void {
  try {
    sessionStorage.setItem(key, String(window.scrollY));
  } catch {
    /* sessionStorage no disponible: ignorar */
  }
}

export function useScrollRestore(key: string, listo: boolean): void {
  useEffect(() => {
    if (!listo) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
    } catch {
      return;
    }
    if (!raw) return;
    const y = Number(raw);
    if (!Number.isFinite(y) || y <= 0) return;
    // rAF: esperamos al primer pintado del contenido antes de saltar.
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, y);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignorar */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [key, listo]);
}
