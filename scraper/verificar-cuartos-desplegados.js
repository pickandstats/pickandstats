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

const estado = (() => {
  try { return JSON.parse(fs.readFileSync(path.join('data', 'processed', 'estado.json'), 'utf8')); }
  catch (e) { return { competiciones: {} }; }
})();
const distBase = path.join('web', 'dist', 'data');
const problemas = [];

for (const g of Object.keys(CFG.COMPETICIONES)) {
  const nombre = CFG.COMPETICIONES[g];
  const sel = estado.competiciones && estado.competiciones[nombre] && estado.competiciones[nombre].temporada;
  if (!sel) { console.log(`${nombre}: sin temporada en estado.json, se omite`); continue; }
  const dir = path.join(distBase, nombre, sel);

  // Gate: solo se exigen cuartos si la temporada tiene partidos jugados. En una
  // temporada recien arrancada sin resultados no hay cuartos que exigir. Se mide
  // sobre partidos.json, que ya esta en el build.
  let jugados = 0;
  const fp = path.join(dir, 'partidos.json');
  if (fs.existsSync(fp)) {
    try { const arr = JSON.parse(fs.readFileSync(fp, 'utf8')); jugados = (Array.isArray(arr) ? arr : []).filter(p => /\d+\s*-\s*\d+/.test(p.resultado || '')).length; } catch (e) {}
  }
  if (jugados === 0) { console.log(`${nombre} ${sel}: sin partidos jugados en el build, no se exigen cuartos`); continue; }

  const faltan = [];
  for (const f of ['jugadores-cuartos.json', 'equipos-cuartos.json', 'partidos-contexto.json']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) faltan.push(f);
  }
  const box = path.join(dir, 'boxscore-cuartos');
  if (!(fs.existsSync(box) && fs.readdirSync(box).some(f => f.endsWith('.json')))) faltan.push('boxscore-cuartos/');

  if (faltan.length) problemas.push(`${nombre} ${sel}: faltan ${faltan.join(', ')}`);
  else console.log(`${nombre} ${sel}: cuartos presentes en el build (${jugados} partidos jugados)`);
}

// Comparador: jugadores-comparador.json debe estar en el build para TODA temporada
// que tenga jugadores.json (el comparador sigue el selector de temporada, no solo
// la vigente). Exigirlo solo donde hay jugadores.json evita gritar en falso en una
// temporada sin datos aun (p.ej. la que arranca).
for (const g of Object.keys(CFG.COMPETICIONES)) {
  const nombre = CFG.COMPETICIONES[g];
  const dirCat = path.join(distBase, nombre);
  if (!fs.existsSync(dirCat)) continue;
  for (const t of fs.readdirSync(dirCat)) {
    const dirT = path.join(dirCat, t);
    if (!fs.statSync(dirT).isDirectory()) continue;
    if (!fs.existsSync(path.join(dirT, 'jugadores.json'))) continue; // sin datos -> no se exige
    const lite = path.join(dirT, 'jugadores-comparador.json');
    if (!fs.existsSync(lite) || fs.statSync(lite).size === 0)
      problemas.push(`${nombre} ${t}: falta jugadores-comparador.json (lo usa el comparador)`);
    else console.log(`${nombre} ${t}: comparador presente en el build`);
  }
}

if (problemas.length) {
  console.error('\n❌ El build NO tiene los ficheros esperados; no se publica:');
  problemas.forEach(p => console.error('  ' + p));
  console.error('El sitio se queda en la version anterior. Revisa el cp del deploy y la generacion en data/processed.');
  process.exit(1);
}
console.log('\nCuartos y comparador presentes en el build para todas las categorias/temporadas con datos. OK.');
