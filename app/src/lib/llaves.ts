// Pestanas del menu COPA. Orden VISUAL de izquierda a derecha:
//   - "Estadisticas": rankings individuales del torneo (goleadores, asist.,
//     goles+asist., penales, amarillas, rojas). Componente PanelEstadisticas.
//     Cada tabla es clickeable -> pantalla dedicada con lista completa.
//   - "Llaves": el cuadro de eliminacion (componente LlavesView, Opcion B).
//     Es la pestana DEFAULT al entrar a Copa (abre en Fase Final). El default
//     esta hardcodeado en pages/Copa.tsx ("llaves"), NO se saca de la posicion
//     del array — asi puedo cambiar el orden visual sin cambiar la default.
//   - "Grupos": la tabla de posiciones de cada grupo (componente TablaGrupos).
// Las antiguas pestanas por fase (16avos/8vos/4tos/semis/3er/final) se movieron
// a la pantalla Partidos. El cuadro completo vive aqui, en "Llaves".

export interface TabCopa {
  key: string;
  label: string;
}

// Clave de la pestana por defecto al entrar a /copa. Debe existir en TABS_COPA.
export const TAB_COPA_DEFAULT = "llaves";

export const TABS_COPA: TabCopa[] = [
  { key: "estadisticas", label: "Estadisticas" },
  { key: "llaves", label: "Llaves" },
  { key: "grupos", label: "Grupos" },
];
