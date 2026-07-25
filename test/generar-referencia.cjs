// Congela valores conocidos-buenos de una temporada cerrada, para que
// test/regresion.cjs avise si un cambio futuro en calcular.js los altera.
// Ejecutar solo cuando los datos actuales son de fiar:
//   node test/generar-referencia.cjs
const p = require('path'), fs = require('fs');

const COMP = 'segundafeb', TEMP = '2024';   // temporada cerrada y revisada
const dir = p.join(process.cwd(), 'data', 'processed', COMP, TEMP);
const cargar = f => { const j = require(p.join(dir, f)); return Array.isArray(j) ? j : Object.values(j); };

const jug = cargar('jugadores.json');
const eq = cargar('equipos.json');

const reales = jug.filter(x => x.idJugador && !String(x.idJugador).startsWith('sin-id'));
const top = reales.slice().sort((a, b) => b.minTotales - a.minTotales).slice(0, 5);

const ref = {
  _generado: new Date().toISOString().slice(0, 10),
  _nota: 'Valores buenos de ' + COMP + ' ' + TEMP + '. Si regresion.cjs falla, un cambio ha alterado el calculo.',
  competicion: COMP, temporada: TEMP,
  totales: {
    nJugadores: jug.length,
    nEquipos: eq.length,
    sumaPuntosLiga: eq.reduce((a, e) => a + (e.pf || 0), 0)   // puntos a favor de todos los equipos
  },
  // Anclamos jugadores por licencia: enteros con igualdad exacta, decimales con tolerancia
  jugadores: top.map(j => ({
    idJugador: String(j.idJugador), nombre: j.nombre,
    exactos: { pj: j.pj, pt: j.pt, minTotales: j.minTotales, t2a: j.t2a, t3a: j.t3a, tla: j.tla },
    aprox: { ts: j.ts, efg: j.efg, per36: j.per36 }
  })),
  equipos: eq.slice().sort((a, b) => (b.pf || 0) - (a.pf || 0)).slice(0, 3).map(e => ({
    nombre: e.nombre,
    exactos: { pj: e.pj, pf: e.pf, pc: e.pc }
  }))
};

fs.writeFileSync(p.join('test', 'referencia.json'), JSON.stringify(ref, null, 2));
console.log('Referencia congelada en test/referencia.json');
console.log('  ' + ref.totales.nJugadores + ' jugadores · ' + ref.totales.nEquipos + ' equipos');
console.log('  jugadores ancla:');
ref.jugadores.forEach(j => console.log('     ' + j.nombre + '  pj=' + j.exactos.pj + ' pt=' + j.exactos.pt + ' ts=' + j.aprox.ts));
