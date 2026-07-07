// Pestanas del menu COPA. Ahora son tres, con "Llaves" primero:
//   - "Llaves": el cuadro de eliminacion (componente LlavesView, Opcion B).
//     Es la pestana por defecto al entrar a Copa (abre en Fase Final).
//   - "Grupos": la tabla de posiciones de cada grupo (componente TablaGrupos).
//   - "Estadisticas": rankings individuales del torneo (goleadores, asist.,
//     goles+asist., amarillas, rojas, penales convertidos). Componente
//     PanelEstadisticas. Top 5 colapsado, click -> lista completa.
// Las antiguas pestanas por fase (16avos/8vos/4tos/semis/3er/final) se movieron
// a la pantalla Partidos. El cuadro completo vive aqui, en "Llaves".

export interface TabCopa {
  key: string;
  label: string;
}

export const TABS_COPA: TabCopa[] = [
  { key: "llaves", label: "Llaves" },
  { key: "grupos", label: "Grupos" },
  { key: "estadisticas", label: "Estadisticas" },
];
