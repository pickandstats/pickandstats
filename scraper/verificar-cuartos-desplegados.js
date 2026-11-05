// Guardian de despliegue (ARQUITECTURA.md S17.4/S16): comprueba que el BUILD que
// se va a publicar contiene los ficheros que el pipeline genera en data/processed
// y sirve por el cp del deploy: los cuartos de la temporada en curso, y el
// jugadores-comparador.json de TODA temporada con datos. Corre en desplegar.yml
// DESPUES del `npm run build` de Vite y ANTES de publicar: si faltan, sale con
// codigo 1, el deploy falla y el sitio se queda en la version anterior (correcta)
// en vez de publicar una incompleta.
//
// Mira web/dist/data/<comp>/<temp>/, que es el mismo antes y despues de mover los
// cuartos de web/public/data a data/processed: hoy llegan a dist porque Vite copia
// web/public/; tras el movimiento, porque el `cp` del deploy los pone en
// web/public/ y Vite los copia igual. El instrumento no se mueve con el cambio.
//
// Uso: node scraper/verificar-cuartos-desplegados.js
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

// Un verificador tiene que fallar cuando no encuentra QUE verificar, cuando
// encuentra menos de lo que hay y cuando la coleccion que recorre esta vacia
// (lote 33, 1.1). Antes este guardian era el caso limite: con `estado.json`
// ilegible tomaba `{competiciones: {}}` y "omitia" las tres categorias; con
// `partidos.json` ausente o ilegible en el build, el `catch` se tragaba el error,
// `jugados` se quedaba en 0 y decia "no se exigen cuartos"; y el mensaje final
// imprimia "OK" con CERO categorias comprobadas. Era el guardian que debia
// impedir publicar sin cuartos, y un `catch` lo convertia en un OK.
const problemas = [];
let estado = null;
try { estado = JSON.parse(fs.readFileSync(path.join('data', 'processed', 'estado.json'), 'utf8')); }
catch (e) { problemas.push(`no se puede leer data/processed/estado.json (${e.message}): no se sabe que temporada exigir`); }
const distBase = path.join('web', 'dist', 'data');
if (!fs.existsSync(distBase)) problemas.push(`no existe ${distBase}: el build no lleva datos`);

// Cuantas categorias se han EVALUADO de verdad (con su partidos.json leido) y
// cuantas llevaban cuartos exigidos. Si no se evalua ninguna, no se ha
// comprobado nada, y eso es un fallo, no un OK.
let evaluadas = 0, conCuartos = 0, sinPartidosAun = 0, comparadores = 0;

if (estado) for (const g of Object.keys(CFG.COMPETICIONES)) {
  const nombre = CFG.COMPETICIONES[g];
  const sel = estado.competiciones && estado.competiciones[nombre] && estado.competiciones[nombre].temporada;
  if (!sel) { problemas.push(`${nombre}: sin temporada en estado.json (el scrape de esta categoria no ha corrido)`); continue; }
  const dir = path.join(distBase, nombre, sel);

  // Gate: solo se exigen cuartos si la temporada tiene partidos jugados (una
  // recien arrancada, sin resultados, no tiene cuartos que exigir). Se mide
  // sobre partidos.json, que ya esta en el build. Que el fichero NO este o no
  // se pueda leer es otra cosa distinta de "0 jugados": no se sabe, y no se
  // publica a ciegas.
  const fp = path.join(dir, 'partidos.json');
  let jugados;
  try {
    const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!Array.isArray(arr)) throw new Error('no es una lista');
    jugados = arr.filter(p => /\d+\s*-\s*\d+/.test(p.resultado || '')).length;
  } catch (e) {
    problemas.push(`${nombre} ${sel}: no se puede leer ${fp} en el build (${e.message}); no se sabe cuantos partidos hay`);
    continue;
  }
  evaluadas++;
  if (jugados === 0) { sinPartidosAun++; console.log(`${nombre} ${sel}: sin partidos jugados en el build, no se exigen cuartos`); continue; }

  const faltan = [];
  for (const f of ['jugadores-cuartos.json', 'equipos-cuartos.json', 'partidos-contexto.json']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) faltan.push(f);
  }
  const box = path.join(dir, 'boxscore-cuartos');
  if (!(fs.existsSync(box) && fs.readdirSync(box).some(f => f.endsWith('.json')))) faltan.push('boxscore-cuartos/');

  if (faltan.length) problemas.push(`${nombre} ${sel}: faltan ${faltan.join(', ')}`);
  else { conCuartos++; console.log(`${nombre} ${sel}: cuartos presentes en el build (${jugados} partidos jugados)`); }
}

// Comparador: jugadores-comparador.json debe estar en el build para TODA temporada
// que tenga jugadores.json (el comparador sigue el selector de temporada, no solo
// la vigente). Exigirlo solo donde hay jugadores.json evita gritar en falso en una
// temporada sin datos aun (p.ej. la que arranca).
for (const g of Object.keys(CFG.COMPETICIONES)) {
  const nombre = CFG.COMPETICIONES[g];
  const dirCat = path.join(distBase, nombre);
  if (!fs.existsSync(dirCat)) { problemas.push(`${nombre}: no hay carpeta en el build (${dirCat})`); continue; }
  for (const t of fs.readdirSync(dirCat)) {
    const dirT = path.join(dirCat, t);
    if (!fs.statSync(dirT).isDirectory()) continue;
    if (!fs.existsSync(path.join(dirT, 'jugadores.json'))) continue; // sin datos -> no se exige
    const lite = path.join(dirT, 'jugadores-comparador.json');
    if (!fs.existsSync(lite) || fs.statSync(lite).size === 0)
      problemas.push(`${nombre} ${t}: falta jugadores-comparador.json (lo usa el comparador)`);
    else { comparadores++; console.log(`${nombre} ${t}: comparador presente en el build`); }
  }
}

// Coleccion vacia = fallo: si no se ha evaluado ninguna categoria o ningun
// comparador, no se ha comprobado nada aunque no haya "problemas" escritos.
if (evaluadas === 0) problemas.push('no se ha podido evaluar NINGUNA categoria: el guardian no ha comprobado nada');
if (comparadores === 0) problemas.push('no se ha encontrado NINGUN jugadores-comparador.json que comprobar en el build');

if (problemas.length) {
  console.error('\n❌ El build NO tiene los ficheros esperados; no se publica:');
  problemas.forEach(p => console.error('  ' + p));
  console.error('El sitio se queda en la version anterior. Revisa el cp del deploy y la generacion en data/processed.');
  process.exit(1);
}
console.log(`\nOK. Comprobado: ${evaluadas} categorias evaluadas (${conCuartos} con cuartos exigidos y presentes, ${sinPartidosAun} sin partidos aun) y ${comparadores} comparadores presentes.`);
