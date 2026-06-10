// Logica de las LLAVES (cuadro de eliminacion directa) de la Copa.
// Fuente unica (DRY): aqui viven el orden de las fases y como se arma el
// cuadro (numeracion + division Lado Izquierdo / Derecho).
//
// Nota: los partidos de eliminatorias estan como "Por definir" hasta que el
// bot/admin cargue los equipos reales. Esta vista es SOLO visual: no influye
// en puntos ni en el juego. Se ordenan por fecha y se numeran "Partido N".
import type { Partido } from "./types";

// Pestanas de la pantalla Copa. Cada una agrupa una o mas fases de la base.
export interface TabCopa {
  key: string;
  label: string;
  fases: string[]; // fases que muestra (vacio = pestana de grupos)
}

export const TABS_COPA: TabCopa[] = [
  { key: "grupos", label: "Grupos", fases: [] },
  { key: "dieciseisavos", label: "Dieciseisavos", fases: ["Dieciseisavos"] },
  { key: "octavos", label: "Octavos", fases: ["Octavos"] },
  { key: "cuartos", label: "Cuartos", fases: ["Cuartos"] },
  { key: "semifinales", label: "Semifinales", fases: ["Semifinales"] },
  { key: "final", label: "Final", fases: ["Final", "Tercer Puesto"] },
];

export interface LlavePartido {
  n: number; // numero "Partido N" dentro de la fase
  partido: Partido;
}

export interface Cuadro {
  izquierda: LlavePartido[];
  derecha: LlavePartido[];
}

// Ordena por fecha, numera 1..N y parte el cuadro en dos lados.
// La primera mitad = Lado Izquierdo, la segunda = Lado Derecho (como la imagen).
export function armarCuadro(partidos: Partido[]): Cuadro {
  const numerados = [...partidos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((partido, i) => ({ n: i + 1, partido }));
  const mitad = Math.ceil(numerados.length / 2);
  return {
    izquierda: numerados.slice(0, mitad),
    derecha: numerados.slice(mitad),
  };
}

// Agrupa una lista en pares [0,1],[2,3]... para dibujar los conectores.
export function enPares<T>(items: T[]): T[][] {
  const pares: T[][] = [];
  for (let i = 0; i < items.length; i += 2) pares.push(items.slice(i, i + 2));
  return pares;
}
