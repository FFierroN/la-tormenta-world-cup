// Hook de gesto: detecta deslizamiento horizontal (swipe) y dispara
// onIzquierda / onDerecha. Reusado en Copa, Partidos y Tabla (DRY).
// Ignora gestos mayormente verticales para no romper el scroll de la lista.
import { useRef, type TouchEvent } from "react";

const UMBRAL = 50; // px minimos de desplazamiento horizontal para contar

export function useSwipe(onIzquierda: () => void, onDerecha: () => void) {
  const inicio = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    inicio.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    if (!inicio.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.current.x;
    const dy = t.clientY - inicio.current.y;
    inicio.current = null;
    // Solo cuenta si el gesto es claramente horizontal.
    if (Math.abs(dx) < UMBRAL || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onIzquierda(); // desliza a la izquierda -> siguiente
    else onDerecha(); // desliza a la derecha -> anterior
  }

  return { onTouchStart, onTouchEnd };
}
