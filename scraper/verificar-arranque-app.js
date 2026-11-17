// Prueba de humo del despliegue: los ficheros que la app pide AL ARRANCAR
// existen en el artefacto y son JSON valido (lote 38).
//
// El 17/11/2026 el despliegue salio verde, los guardianes de cuartos y de la
// cinta salieron verdes, y la portada no cargaba: temporadas.json solo existia
// en el espejo web/public/data y desaparecio al dejar de versionarlo. Ningun
// paso comprobaba lo unico que importa al lector: que la app arranque. Un
// despliegue verde no es un sitio que funciona.
//
// La lista sale de lo que App.jsx pide en el primer render (useEffects de
// arranque y de competicion+temporada), y debe seguirla si App.jsx cambia:
//   - global: estado.json, equipos-datos.json
//   - por competicion: temporadas.json (sin el, la app va al error), historico.json
//   - por competicion y temporada listada: equipos, jugadores, carreras y
//     partidos.json (los carga sin catch: si falta uno, la app va al error)
//   - opcionales (App.jsx los carga con .catch): jugadores-cuartos,
//     equipos-cuartos, fases y parametros.json -- solo se avisa; los cuartos de
//     2023 y 2024 no existen y la app lo tolera.
//
// Uso: node scraper/verificar-arranque-app.js [_publish/app]
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

const raiz = path.join(process.argv[2] || path.join('_publish', 'app'), 'data');
const fallos = [], avisos = [];
let comprobados = 0;

function leer(rel, obligatorio = true) {
  const f = path.join(raiz, rel);
  if (!fs.existsSync(f)) { (obligatorio ? fallos : avisos).push(`falta ${rel}`); return null; }
  comprobados++;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { (obligatorio ? fallos : avisos).push(`${rel} no es JSON valido (${e.message.slice(0, 60)})`); return null; }
}

leer('estado.json');
leer('equipos-datos.json');
for (const comp of Object.values(CFG.COMPETICIONES)) {
  const temporadas = leer(`${comp}/temporadas.json`);
  leer(`${comp}/historico.json`);
  if (!Array.isArray(temporadas) || !temporadas.length) {
    if (temporadas) fallos.push(`${comp}/temporadas.json no es una lista con temporadas`);
    continue;
  }
  for (const t of temporadas) {
    for (const f of ['equipos', 'jugadores', 'carreras', 'partidos']) leer(`${comp}/${t}/${f}.json`);
    for (const f of ['jugadores-cuartos', 'equipos-cuartos', 'fases', 'parametros']) leer(`${comp}/${t}/${f}.json`, false);
  }
}

console.log(`Arranque de la app: ${comprobados} ficheros presentes en ${raiz}`);
if (avisos.length) console.log(`  opcionales ausentes (la app los tolera): ${avisos.length}`);
if (fallos.length) {
  console.log('\nERROR: la app no arrancaria con este artefacto:');
  fallos.forEach(f => console.log('  ❌ ' + f));
  process.exit(1);
}
console.log('OK: todo lo que la app pide al arrancar esta en el artefacto.');
