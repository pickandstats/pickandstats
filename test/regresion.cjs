// Recalcula las temporadas congeladas y las compara con test/referencia.json.
// Enteros: igualdad exacta. Decimales: tolerancia relativa del 0,5%.
//   node test/regresion.cjs                     (todas)
//   node test/regresion.cjs segundafeb 2024     (una concreta)
const p = require('path'), fs = require('fs');
const { execSync } = require('child_process');

const ref = JSON.parse(fs.readFileSync(p.join('test', 'referencia.json'), 'utf8'));
const COMP_ID = { primerafeb: 1, segundafeb: 2, tercerafeb: 3 };
const TOL = 0.005;
const fComp = process.argv[2], fTemp = process.argv[3];

let fallosTotal = 0;
const cargar = (dir, f) => { const r = require.resolve(p.join(dir, f)); delete require.cache[r]; const j = require(r); return Array.isArray(j) ? j : Object.values(j); };

for (const snap of ref.temporadas) {
  if (fComp && snap.competicion !== fComp) continue;
  if (fTemp && snap.temporada !== fTemp) continue;

  let fallos = 0;
  const fallo = m => { fallos++; console.log('   ✗ ' + m); };
  const exacto = (et, a, b) => { if (a !== b) fallo(et + ': esperado ' + a + ', obtenido ' + b); };
  const aprox = (et, a, b) => { if (Math.abs(a - b) / (Math.abs(a) || 1) > TOL) fallo(et + ': esperado ' + a + ', obtenido ' + b); };

  console.log('\n### ' + snap.competicion + ' ' + snap.temporada + ' ###');
  execSync('node scraper/calcular.js --competicion ' + COMP_ID[snap.competicion] + ' --temporada ' + snap.temporada, { stdio: 'ignore' });

  const dir = p.join(process.cwd(), 'data', 'processed', snap.competicion, snap.temporada);
  const jug = cargar(dir, 'jugadores.json'), eq = cargar(dir, 'equipos.json');

  exacto('nJugadores', snap.totales.nJugadores, jug.length);
  exacto('nEquipos', snap.totales.nEquipos, eq.length);
  exacto('sumaPuntosLiga', snap.totales.sumaPuntosLiga, eq.reduce((a, e) => a + (e.pf || 0), 0));

  for (const j of snap.jugadores) {
    const a = jug.find(x => String(x.idJugador) === j.idJugador);
    if (!a) { fallo(j.nombre + ': ya no aparece'); continue; }
    for (const [k, v] of Object.entries(j.exactos)) exacto(j.nombre + '.' + k, v, a[k]);
    for (const [k, v] of Object.entries(j.aprox)) aprox(j.nombre + '.' + k, v, a[k]);
  }
  for (const e of snap.equipos) {
    const a = eq.find(x => x.nombre === e.nombre);
    if (!a) { fallo(e.nombre + ': ya no aparece'); continue; }
    for (const [k, v] of Object.entries(e.exactos)) exacto(e.nombre + '.' + k, v, a[k]);
    for (const [k, v] of Object.entries(e.aprox || {})) aprox(e.nombre + '.' + k, v, a[k]);
  }

  console.log(fallos ? '   ❌ ' + fallos + ' diferencia(s)' : '   ✅ cuadra');
  fallosTotal += fallos;
}

console.log('\n' + (fallosTotal
  ? '❌ ' + fallosTotal + ' diferencia(s) en total.'
  : '✅ Las temporadas verificadas cuadran con la referencia.'));
process.exit(fallosTotal ? 1 : 0);
