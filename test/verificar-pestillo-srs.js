// Prueba de que el pestillo del SRS (S17.8/S17.9) ENGANCHA, no solo calcula: una
// vez que calcular.js marca un grupo como asentado en parametros.json, una
// ejecucion posterior sobre un corte donde el criterio en vivo volveria a dar
// `false` no debe apagarlo. Es la unica propiedad del pestillo que solo se
// manifiesta en el futuro (un rebote dentro de semanas), asi que es la unica que
// hay que provocar para creerla -- confirmar que el OR contra el valor guardado
// sigue ahi tras el renombrado a parametros.json (ver _informe-min-pj-duplicado.md
// y el commit que lo hizo).
//
// Fabrica un grupo sintetico de 4 equipos con un unico partido jugado cada uno
// (jornada 1): con un solo rival, min(pj)=1 < 2, asi que el suelo del pestillo
// nunca se cumple para este corte y el criterio en vivo siempre da `false`,
// pase lo que pase con |srs-net|. No depende de en que jornada este ninguna
// temporada real, asi que no se rompe solo con que pase el tiempo.
//
// Uso: node test/verificar-pestillo-srs.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COMP = 'tercerafeb';
const TEMP = '_prueba-pestillo'; // con "_" a proposito: marca visible de fixture, nunca una temporada real
const GRUPO = 'TEST';
const DIR_RAW = path.join('data', 'raw', COMP, TEMP, GRUPO);
const DIR_OUT = path.join('data', 'processed', COMP, TEMP);
const F_PARAMETROS = path.join(DIR_OUT, 'parametros.json');

function limpiar() {
  fs.rmSync(path.join('data', 'raw', COMP, TEMP), { recursive: true, force: true });
  fs.rmSync(DIR_OUT, { recursive: true, force: true });
}

// Boxscore minimo pero valido: un unico jugador por equipo con produccion
// suficiente para que posesiones > 0 (si no, net sale Infinity/NaN).
function jugador(nombre, pt) {
  return {
    idJugador: 'synt-' + nombre, titular: true, dorsal: '1', nombre, seg: 1600,
    pt, t2: { a: Math.ceil(pt / 2), i: Math.ceil(pt / 2) + 3 }, t3: { a: 0, i: 0 },
    tl: { a: 0, i: 0 }, ro: 5, rd: 5, rt: 10, as: 3, br: 1, bp: 2,
    tf: 0, tco: 0, mt: 0, fc: 2, fr: 1, va: 0, pm: 0,
  };
}

function partido(id, local, visitante, ptLocal, ptVisitante) {
  return {
    id: String(id), temporada: TEMP, competicion: COMP, grupo: GRUPO,
    jornada: 'Jornada 1(01/01/2000)',
    equipoLocal: { id: 'eq-' + local, nombre: local },
    equipoVisitante: { id: 'eq-' + visitante, nombre: visitante },
    resultado: `${ptLocal}-${ptVisitante}`, disputado: true,
    boxscore: { local: [jugador(local, ptLocal)], visitante: [jugador(visitante, ptVisitante)] },
  };
}

function correr() {
  execSync(`node scraper/calcular.js --competicion 3 --temporada ${TEMP}`, { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(F_PARAMETROS, 'utf8'));
}

let fallos = 0;
const comprobar = (etiqueta, cond) => {
  if (cond) { console.log('   ✓ ' + etiqueta); }
  else { fallos++; console.log('   ✗ ' + etiqueta); }
};

try {
  limpiar();
  fs.mkdirSync(DIR_RAW, { recursive: true });
  const partidos = [
    partido(1, 'Equipo A', 'Equipo B', 75, 70),
    partido(2, 'Equipo C', 'Equipo D', 60, 65),
  ];
  for (const p of partidos) fs.writeFileSync(path.join(DIR_RAW, p.id + '.json'), JSON.stringify(p, null, 1));

  console.log('### Paso 1: corte fresco (jornada 1, sin parametros.json previo) ###');
  const p1 = correr();
  comprobar(`minPj presente (${p1.minPj})`, Number.isFinite(p1.minPj));
  comprobar(`${GRUPO} calcula 'false' en vivo (min(pj)=1 < 2)`, p1.srsPestillo[GRUPO] === false);

  console.log('### Paso 2: se fuerza el pestillo a mano a \'true\' ###');
  p1.srsPestillo[GRUPO] = true;
  fs.writeFileSync(F_PARAMETROS, JSON.stringify(p1, null, 1));
  comprobar('forzado a true en parametros.json', JSON.parse(fs.readFileSync(F_PARAMETROS, 'utf8')).srsPestillo[GRUPO] === true);

  console.log('### Paso 3: se repite exactamente el mismo corte (seguiria dando \'false\' en vivo) ###');
  const p2 = correr();
  comprobar(`${GRUPO} SIGUE en 'true' pese a que el corte no cambio (el OR engancha, no recalcula)`,
    p2.srsPestillo[GRUPO] === true);
} finally {
  limpiar();
  console.log('(sandbox de prueba limpiado: ' + path.join('data', 'raw', COMP, TEMP) + ' y ' + DIR_OUT + ')');
}

console.log(fallos ? `\n❌ ${fallos} fallo(s).` : '\n✅ El pestillo engancha: sobrevive a un corte que, solo, lo apagaria.');
process.exit(fallos ? 1 : 0);
