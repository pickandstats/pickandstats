// Suelo de VOLUMEN para las métricas de porcentaje (lote 32, 04/11/2026; lote
// 33 lo extiende al triple y al eFG%, cada uno con SU denominador).
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

// Triple: el denominador son los triples intentados; eFG%: los tiros de campo
// intentados (t2i + t3i). Medidos el 05/11 sobre los elegibles (minPj) de las tres
// categorías: 3PA >= 1,5 deja el 64-65 %; FGA >= 4 deja el 74-76 % (el TS% con 5
// ponderados deja el 71-72 %). El triple pide menos por partido porque es un
// tiro que muchos jugadores casi no intentan; con 1,5 en 4 partidos son ya 6
// intentos: el suelo por partido NO garantiza una muestra grande al principio de
// temporada, solo deja fuera la que es ridícula; la muestra crece sola con las jornadas.
export const SUELO_INTENTOS_T3_POR_PARTIDO = 1.5;
export const SUELO_INTENTOS_FG_POR_PARTIDO = 4;

const ponderados = f => (f.t2i || 0) + (f.t3i || 0) + 0.44 * (f.tli || 0);
const campo = f => (f.t2i || 0) + (f.t3i || 0);
const triples = f => f.t3i || 0;

// Admite una fila de `jugadores.json` (t2i, t3i, tli, pj en la propia fila) o
// una `carrera` (los intentos viven en sus `etapas`, el pj en la carrera).
const porPartido = (x, intentosDe) => {
  const pj = x.pj || 0;
  if (pj <= 0) return 0;
  const total = Array.isArray(x.etapas) && x.etapas.length
    ? x.etapas.reduce((acc, e) => acc + intentosDe(e), 0)
    : intentosDe(x);
  return total / pj;
};

export const intentosPonderadosPorPartido = x => porPartido(x, ponderados);
export const intentosTriplePorPartido = x => porPartido(x, triples);
export const intentosCampoPorPartido = x => porPartido(x, campo);

// Una fila sin NINGUN contador de intentos (un fichero generado antes del lote
// 33) no permite decidir: no se la censura -- seria pintar un hueco que no sabemos
// justificar --, se la deja pasar como hasta ahora.
const sinContadores = x =>
  !(Array.isArray(x.etapas) && x.etapas.length) && x.t2i === undefined && x.t3i === undefined && x.tli === undefined;

export const tieneIntentosSuficientesTS = x =>
  sinContadores(x) || intentosPonderadosPorPartido(x) >= SUELO_INTENTOS_TS_POR_PARTIDO;
export const tieneIntentosSuficientesT3 = x =>
  sinContadores(x) || intentosTriplePorPartido(x) >= SUELO_INTENTOS_T3_POR_PARTIDO;
export const tieneIntentosSuficientesFG = x =>
  sinContadores(x) || intentosCampoPorPartido(x) >= SUELO_INTENTOS_FG_POR_PARTIDO;

// Por clave de métrica de acierto (la de percentiles y la de las listas).
export const tieneIntentosSuficientes = (x, clave) =>
  clave === 'ts' ? tieneIntentosSuficientesTS(x)
    : clave === 't3Pct' ? tieneIntentosSuficientesT3(x)
    : clave === 'efg' ? tieneIntentosSuficientesFG(x)
    : true;

// Texto del suelo de cada métrica, para las notas de debajo de gráficos y fichas.
export const SUELO_TEXTO = {
  ts: `${SUELO_INTENTOS_TS_POR_PARTIDO} intentos de tiro ponderados por partido (tiros de campo más 0,44 por cada libre)`,
  t3Pct: `${String(SUELO_INTENTOS_T3_POR_PARTIDO).replace('.', ',')} triples intentados por partido`,
  efg: `${SUELO_INTENTOS_FG_POR_PARTIDO} tiros de campo intentados por partido`,
};
