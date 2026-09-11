// Agregador del observatorio de estilo de juego. Primer ladrillo: emite
// data/processed/estilo-liga.json con las medias de LIGA (no la media de las
// medias de equipo) por categoria y temporada, para que los tres cortes del
// observatorio (inicio/mitad/cierre) salgan del mismo calculo repetible.
//
// NO esta enchufado a actualizar-datos.yml todavia, a proposito: el mismo
// criterio que se aplica a otros cambios grandes se aplica aqui — no se toca el
// workflow de datos en las semanas previas a su estreno de temporada (28/9/2026).
// Se ejecuta a mano hasta que el pipeline haya demostrado que aguanta una
// temporada viva; cablearlo es el siguiente paso, no este.
//
// Uso: node scraper/estilo-liga.js
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

// Todas estas son tasas ya calculadas en calcular.js sobre los partidos CON
// ACTA (el pace es posesiones/pj, el eFG% es tiros/pj, etc.). El peso de la
// media ponderada tiene que ser esa misma muestra: pj, NO balance.pj (S17.6,
// "equipos: balance oficial..."). balance.pj cuenta tambien los partidos sin
// acta, que no aportaron nada al numerador de estas tasas — usarlo mezclaria
// un numerador de 25 partidos con un denominador de 26. Es el mismo error que
// evitamos la semana pasada, por la puerta de al lado.
const CAMPOS = ['pace', 't3ar', 'efg', 't3Pct', 'ortg', 'ts', 'ftRate', 'orbPct', 'tovPct'];

const r4 = x => Math.round(x * 10000) / 10000;

const DIR_BASE = path.join('data', 'processed');
const salida = {};

for (const compId of Object.keys(CFG.COMPETICIONES)) {
  const comp = CFG.COMPETICIONES[compId];
  const dirComp = path.join(DIR_BASE, comp);
  if (!fs.existsSync(dirComp)) continue;

  const porTemporada = {};
  for (const temporada of fs.readdirSync(dirComp).sort()) {
    const fEquipos = path.join(dirComp, temporada, 'equipos.json');
    // Temporadas sin equipos.json (solo calendario, como la 2026 hoy) se
    // saltan sin más: no hay nada que agregar todavía, y eso es normal, no un
    // error — el observatorio tiene que poder correr con la temporada en
    // marcha y con jornadas sueltas, no solo con la liga cerrada.
    if (!fs.statSync(path.join(dirComp, temporada)).isDirectory()) continue;
    if (!fs.existsSync(fEquipos)) continue;

    let equipos;
    try { equipos = JSON.parse(fs.readFileSync(fEquipos, 'utf8')); } catch (e) { continue; }
    if (!Array.isArray(equipos) || !equipos.length) continue;

    const sumaPj = equipos.reduce((a, e) => a + e.pj, 0);
    if (!sumaPj) continue; // liga sin un solo partido disputado: nada que promediar aun

    const medias = {};
    for (const campo of CAMPOS) {
      const suma = equipos.reduce((a, e) => a + e[campo] * e.pj, 0);
      medias[campo] = r4(suma / sumaPj);
    }

    porTemporada[temporada] = {
      equipos: equipos.length,
      // Cada partido aparece en el pj de los dos equipos que lo jugaron.
      partidos: sumaPj / 2,
      ...medias
    };
  }

  if (Object.keys(porTemporada).length) salida[comp] = porTemporada;
}

const fSalida = path.join(DIR_BASE, 'estilo-liga.json');
fs.writeFileSync(fSalida, JSON.stringify(salida, null, 2));

for (const comp of Object.keys(salida)) {
  for (const temp of Object.keys(salida[comp])) {
    const s = salida[comp][temp];
    console.log(`${comp} ${temp}: ${s.equipos} equipos, ${s.partidos} partidos`);
  }
}
console.log(`\nEscrito en ${fSalida}`);
