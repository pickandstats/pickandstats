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
const resultadoPorTemporada = [];
const camposAfectados = new Set();
const cargar = (dir, f) => { const r = require.resolve(p.join(dir, f)); delete require.cache[r]; const j = require(r); return Array.isArray(j) ? j : Object.values(j); };

for (const snap of ref.temporadas) {
  if (fComp && snap.competicion !== fComp) continue;
  if (fTemp && snap.temporada !== fTemp) continue;

  let fallos = 0;
  const camposTemp = new Set();
  const fallo = (m, campo) => { fallos++; console.log('   ✗ ' + m); if (campo) camposTemp.add(campo); };
  const exacto = (et, a, b) => { if (a !== b) fallo(et + ': esperado ' + a + ', obtenido ' + b, et.split('.').pop()); };
  const aprox = (et, a, b) => { if (Math.abs(a - b) / (Math.abs(a) || 1) > TOL) fallo(et + ': esperado ' + a + ', obtenido ' + b, et.split('.').pop()); };

  console.log('\n### ' + snap.competicion + ' ' + snap.temporada + ' ###');
  execSync('node scraper/calcular.js --competicion ' + COMP_ID[snap.competicion] + ' --temporada ' + snap.temporada, { stdio: 'ignore' });

  const dir = p.join(process.cwd(), 'data', 'processed', snap.competicion, snap.temporada);
  const jug = cargar(dir, 'jugadores.json'), eq = cargar(dir, 'equipos.json');

  exacto('nJugadores', snap.totales.nJugadores, jug.length);
  exacto('nEquipos', snap.totales.nEquipos, eq.length);
  exacto('sumaPuntosLiga', snap.totales.sumaPuntosLiga, eq.reduce((a, e) => a + (e.pf || 0), 0));

  for (const j of snap.jugadores) {
    const a = jug.find(x => String(x.idJugador) === j.idJugador);
    if (!a) { fallo(j.nombre + ': ya no aparece', 'jugador-desaparecido'); continue; }
    for (const [k, v] of Object.entries(j.exactos)) exacto(j.nombre + '.' + k, v, a[k]);
    for (const [k, v] of Object.entries(j.aprox)) aprox(j.nombre + '.' + k, v, a[k]);
  }
  for (const e of snap.equipos) {
    const a = eq.find(x => x.nombre === e.nombre);
    if (!a) { fallo(e.nombre + ': ya no aparece', 'equipo-desaparecido'); continue; }
    for (const [k, v] of Object.entries(e.exactos)) exacto(e.nombre + '.' + k, v, a[k]);
    for (const [k, v] of Object.entries(e.aprox || {})) aprox(e.nombre + '.' + k, v, a[k]);
  }

  console.log(fallos ? '   ❌ ' + fallos + ' diferencia(s)' : '   ✅ cuadra');
  fallosTotal += fallos;
  resultadoPorTemporada.push({ competicion: snap.competicion, temporada: snap.temporada, fallos, campos: [...camposTemp] });
  for (const c of camposTemp) camposAfectados.add(c);
}

console.log('\n' + (fallosTotal
  ? '❌ ' + fallosTotal + ' diferencia(s) en total.'
  : '✅ Las temporadas verificadas cuadran con la referencia.'));

// El paso del workflow que corre esto lleva continue-on-error:true a proposito
// (los datos nuevos son validos aunque la referencia este vieja, S17.5) -- pero
// eso significa que el ❌ de arriba solo vive en el log del job, y ahi nadie
// mira (confirmado: estuvo en rojo 6 semanas, del 9/9 al 20/10, sin que nadie
// lo viera -- ver _informe-auditoria-truncadas.md). Escribe el veredicto para
// que resumen-salud.js, que SI pone el workflow en rojo de verdad, lo lea y lo
// convierta en critico.
try {
  fs.writeFileSync(p.join('data', 'processed', 'regresion-ultimo-resultado.json'), JSON.stringify({
    fecha: new Date().toISOString().slice(0, 10),
    fallosTotal,
    camposAfectados: [...camposAfectados].sort(),
    temporadas: resultadoPorTemporada,
  }, null, 1));
} catch (e) { console.error('(no se pudo escribir regresion-ultimo-resultado.json: ' + e.message + ')'); }

process.exit(fallosTotal ? 1 : 0);
