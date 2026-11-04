// Suelo de VOLUMEN para las métricas de porcentaje (lote 32, 04/11/2026).
//
// Una media por partido necesita PARTIDOS suficientes (`minPj`, móvil); un
// porcentaje de acierto necesita INTENTOS suficientes. Son dos preguntas
// distintas y por eso son dos banderas, no un booleano: "tiene partidos
// suficientes" decide si el jugador ENTRA en una lista o en la base de
// percentiles; "tiene intentos suficientes" decide si ESE eje (el TS%) se
// pinta. Un jugador con dos tiros en cuatro partidos tenía el primer líder de
// la Tercera (TS% = 125,0): dice más del tamaño de la muestra que del jugador.
//
// Intentos ponderados = tiros de campo intentados + 0,44 × tiros libres
// intentados (la misma ponderación del TS% en scraper/calcular.js). El suelo es
// POR PARTIDO, igual que `minPj` es un número de partidos: sube solo con la
// temporada, sin parámetro nuevo (medido el 03/11: deja entre el 70 y el 72 %
// de los elegibles en las tres categorías).
export const SUELO_INTENTOS_TS_POR_PARTIDO = 5;

const ponderados = f => (f.t2i || 0) + (f.t3i || 0) + 0.44 * (f.tli || 0);

// Admite una fila de `jugadores.json` (t2i, t3i, tli, pj en la propia fila) o
// una `carrera` (los intentos viven en sus `etapas`, el pj en la carrera).
export const intentosPonderadosPorPartido = x => {
  const pj = x.pj || 0;
  if (pj <= 0) return 0;
  const total = Array.isArray(x.etapas) && x.etapas.length
    ? x.etapas.reduce((acc, e) => acc + ponderados(e), 0)
    : ponderados(x);
  return total / pj;
};

export const tieneIntentosSuficientesTS = x =>
  intentosPonderadosPorPartido(x) >= SUELO_INTENTOS_TS_POR_PARTIDO;
