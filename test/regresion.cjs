// Recalcula una temporada cerrada y la compara con test/referencia.json.
// Si algo ha cambiado en el cálculo, lo avisa. Uso: node test/regresion.cjs
// Enteros: igualdad exacta. Decimales: tolerancia relativa del 0,5%.
const p = require('path'), fs = require('fs');
const { execSync } = require('child_process');

const ref = JSON.parse(fs.readFileSync(p.join('test', 'referencia.json'), 'utf8'));
const COMP_ID = { primerafeb: 1, segundafeb: 2, tercerafeb: 3 }[ref.competicion];
const TOL = 0.005;

let fallos = 0;
const fallo = m => { fallos++; console.log('   ✗ ' + m); };
const okExacto = (et, a, b) => { if (a !== b) fallo(et + ': esperado ' + a + ', obtenido ' + b); };
const okAprox = (et, a, b) => {
  const dif = Math.abs(a - b) / (Math.abs(a) || 1);
  if (dif > TOL) fallo(et + ': esperado ' + a + ', obtenido ' + b + ' (dif ' + (dif * 100).toFixed(2) + '%)');
};

// 1. Recalcular desde crudo (sobrescribe processed de esa temporada)
console.log('Recalculando ' + ref.competicion + ' ' + ref.temporada + '...');
execSync('node scraper/calcular.js --competicion ' + COMP_ID + ' --temporada ' + ref.temporada, { stdio: 'ignore' });

const dir = p.join(process.cwd(), 'data', 'processed', ref.competicion, ref.temporada);
const cargar = f => { delete require.cache[require.resolve(p.join(dir, f))]; const j = require(p.join(dir, f)); return Array.isArray(j) ? j : Object.values(j); };
const jug = cargar('jugadores.json'), eq = cargar('equipos.json');

// 2. Totales
console.log('\nTotales:');
okExacto('nJugadores', ref.totales.nJugadores, jug.length);
okExacto('nEquipos', ref.totales.nEquipos, eq.length);
okExacto('sumaPuntosLiga', ref.totales.sumaPuntosLiga, eq.reduce((a, e) => a + (e.pf || 0), 0));

// 3. Jugadores ancla
console.log('Jugadores ancla:');
for (const j of ref.jugadores) {
  const actual = jug.find(x => String(x.idJugador) === j.idJugador);
  if (!actual) { fallo(j.nombre + ': ya no aparece'); continue; }
  for (const [k, v] of Object.entries(j.exactos)) okExacto(j.nombre + '.' + k, v, actual[k]);
  for (const [k, v] of Object.entries(j.aprox)) okAprox(j.nombre + '.' + k, v, actual[k]);
}

// 4. Equipos ancla
console.log('Equipos ancla:');
for (const e of ref.equipos) {
  const actual = eq.find(x => x.nombre === e.nombre);
  if (!actual) { fallo(e.nombre + ': ya no aparece'); continue; }
  for (const [k, v] of Object.entries(e.exactos)) okExacto(e.nombre + '.' + k, v, actual[k]);
}

console.log('\n' + (fallos
  ? '❌ ' + fallos + ' diferencia(s). Si el cambio es intencionado, regenera la referencia.'
  : '✅ Todo cuadra con la referencia. El cálculo no ha cambiado.'));
process.exit(fallos ? 1 : 0);
