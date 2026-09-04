// Familias de guías. Fuente única: el schema valida contra estas claves, el índice
// agrupa en este orden y la ficha de cada guía las usa para la miga de pan.
// Añadir una familia es tocar solo este fichero.

export const CLAVES = ['metricas', 'competicion', 'equipos'] as const;
export type Familia = (typeof CLAVES)[number];

// El orden de este array es el orden en el que aparecen las secciones del índice.
export const FAMILIAS: { clave: Familia; titulo: string; entradilla: string }[] = [
  {
    clave: 'metricas',
    titulo: 'Entender las estadísticas',
    entradilla:
      'Qué mide cada número de Pick&Stats, cómo se calcula y qué no se le puede pedir.',
  },
  {
    clave: 'competicion',
    titulo: 'Cómo funciona la competición',
    entradilla:
      'Ascensos, descensos y formatos de fase final en las tres categorías FEB.',
  },
  {
    clave: 'equipos',
    titulo: 'Equipos y grupos',
    entradilla: 'Quién juega cada temporada, en qué grupo y de dónde viene.',
  },
];

export const familiaDe = (clave: Familia) => FAMILIAS.find(f => f.clave === clave)!;
