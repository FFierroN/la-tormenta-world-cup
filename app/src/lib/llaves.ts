// Pestanas del menu COPA. Ahora son solo dos:
//   - "Grupos": la tabla de posiciones de cada grupo (componente TablaGrupos).
//   - "Llaves": el cuadro de eliminacion (componente LlavesView, Opcion B).
// Las antiguas pestanas por fase (16avos/8vos/4tos/semis/3er/final) se movieron
// a la pantalla Partidos. El cuadro completo vive aqui, en "Llaves".

export interface TabCopa {
  key: string;
  label: string;
}

export const TABS_COPA: TabCopa[] = [
  { key: "grupos", label: "Grupos" },
  { key: "llaves", label: "Llaves" },
];
