// Prueba del umbral movil de partidos jugados (_instrucciones.md 21/10, punto 1):
// minPj = max(3, ceil(0.6 x jornadas jugadas)), jornadas jugadas = mediana de
// partidos jugados por los equipos. Fija tres puntos de la formula (temprano,
// intermedio, temporada cerrada) y falla si calcular.js vuelve a devolver el
// 12 fijo de antes.
//
// Uso: node test/verificar-umbral-minpj.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { minPjDe } = require('../scraper/umbral-min-pj');

let fallos = 0;
const comprobar = (etiqueta, cond) => {
  if (cond) { console.log('   ✓ ' + etiqueta); }
  else { fallos++; console.log('   ✗ ' + etiqueta); }
};

console.log('### Formula pura (tres puntos) ###');
// Temprano (jornada 4): el 60% (2.4 -> 3) y el suelo (3) coinciden -- es la
// jornada en la que exigir el 12 fijo equivale a asistencia perfecta.
comprobar('jornadas=4 -> minPj=3 (temprano, el suelo manda)', minPjDe(4) === 3);
// Intermedio: el 60% ya pesa mas que el suelo (demuestra que la formula no
// es solo "max(3, ...)" colapsado al suelo todo el tiempo).
comprobar('jornadas=10 -> minPj=6 (el 60% ya manda, no el suelo)', minPjDe(10) === 6);
// Temporada cerrada, medido sobre datos reales (ver informe de este lote):
// Primera 2025 jugo 32 jornadas (17 equipos, doble vuelta), no 34 -- el 21/34
// de instrucciones no se sostuvo al medir contra equipos.json; el 16/26 de
// "el resto" si.
comprobar('jornadas=32 -> minPj=20 (Primera 2025 real, temporada cerrada)', minPjDe(32) === 20);
comprobar('jornadas=26 -> minPj=16 (Segunda/Tercera 2025 real, temporada cerrada)', minPjDe(26) === 16);
comprobar('el 12 fijo no sobrevive a ningun punto de arriba', minPjDe(4) !== 12 && minPjDe(32) !== 12);

// ---- Comprobacion de extremo a extremo: calcular.js tiene que devolver el
// valor de la formula, no un 12 fijo ni una copia desincronizada de la formula.
// Sandbox de 4 equipos jugando exactamente 4 jornadas cada uno (todos contra
// todos, ida), para que la mediana de pj sea 4 de forma inequivoca.
const COMP = 'tercerafeb';
const TEMP = '_prueba-umbral-minpj';
const GRUPO = 'TEST';
const DIR_RAW = path.join('data', 'raw', COMP, TEMP, GRUPO);
const DIR_OUT = path.join('data', 'processed', COMP, TEMP);
const F_PARAMETROS = path.join(DIR_OUT, 'parametros.json');

function limpiar() {
  fs.rmSync(path.join('data', 'raw', COMP, TEMP), { recursive: true, force: true });
  fs.rmSync(DIR_OUT, { recursive: true, force: true });
}

function jugador(nombre, pt) {
  return {
    idJugador: 'synt-' + nombre, titular: true, dorsal: '1', nombre, seg: 1600,
    pt, t2: { a: Math.ceil(pt / 2), i: Math.ceil(pt / 2) + 3 }, t3: { a: 0, i: 0 },
    tl: { a: 0, i: 0 }, ro: 5, rd: 5, rt: 10, as: 3, br: 1, bp: 2,
    tf: 0, tco: 0, mt: 0, fc: 2, fr: 1, va: 0, pm: 0,
  };
}

function partido(id, jornada, local, visitante, ptLocal, ptVisitante) {
  return {
    id: String(id), temporada: TEMP, competicion: COMP, grupo: GRUPO,
    jornada: `Jornada ${jornada}(01/01/2000)`,
    equipoLocal: { id: 'eq-' + local, nombre: local },
    equipoVisitante: { id: 'eq-' + visitante, nombre: visitante },
    resultado: `${ptLocal}-${ptVisitante}`, disputado: true,
    boxscore: { local: [jugador(local, ptLocal)], visitante: [jugador(visitante, ptVisitante)] },
  };
}

console.log('\n### Extremo a extremo: sandbox de 4 equipos, 4 jornadas (todos contra todos) ###');
try {
  limpiar();
  fs.mkdirSync(DIR_RAW, { recursive: true });
  const equipos4 = ['Equipo A', 'Equipo B', 'Equipo C', 'Equipo D'];
  // Todos contra todos a una vuelta: 4 jornadas exactas, cada equipo juega
  // una vez por jornada -- pj=4 para los cuatro, mediana=4 sin ambiguedad.
  const emparejamientos = [
    [0, 1], [2, 3],
    [0, 2], [1, 3],
    [0, 3], [1, 2],
  ];
  // Con 4 equipos y 6 emparejamientos (todos contra todos una vez) hacen
  // falta 3 jornadas, no 4 -- para forzar exactamente 4 jornadas jugadas se
  // repite la primera ronda como jornada 4 (incrementando el resultado, da
  // igual el marcador: solo importa pj).
  const jornadas = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
    [[0, 1], [2, 3]],
  ];
  let id = 1;
  const partidos = [];
  jornadas.forEach((pares, ji) => {
    pares.forEach(([li, vi]) => {
      partidos.push(partido(id++, ji + 1, equipos4[li], equipos4[vi], 70 + id, 65 + id));
    });
  });
  for (const p of partidos) fs.writeFileSync(path.join(DIR_RAW, p.id + '.json'), JSON.stringify(p, null, 1));

  execSync(`node scraper/calcular.js --competicion 3 --temporada ${TEMP}`, { stdio: 'ignore' });
  const params = JSON.parse(fs.readFileSync(F_PARAMETROS, 'utf8'));
  comprobar(`minPj presente (${params.minPj})`, Number.isFinite(params.minPj));
  comprobar('minPj === 3 (mediana pj=4, formula: max(3, ceil(0.6*4))=3)', params.minPj === 3);
  comprobar('minPj NO es el 12 fijo de antes', params.minPj !== 12);
} finally {
  limpiar();
  console.log('(sandbox de prueba limpiado: ' + path.join('data', 'raw', COMP, TEMP) + ' y ' + DIR_OUT + ')');
}

console.log(fallos ? `\n❌ ${fallos} fallo(s).` : '\n✅ El umbral movil cuadra en los tres puntos y calcular.js lo usa de verdad.');
process.exit(fallos ? 1 : 0);
