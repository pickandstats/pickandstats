// Refresca el calendario de la temporada "próxima/máxima" cuando difiere de la
// seleccionada en la FEB (situación de pretemporada y arranque de liga).
//
// Orquesta scrape.js (para actualizar los _indice.json de esa temporada) y
// calcular-calendario.js (para regenerar el calendario.json desde esos índices).
// Ambos son idempotentes en la práctica: si nada cambió, no ensucian git.
//
// Pensado para el workflow semanal, que solo tiene que llamar:
//   node scraper/refrescar-calendario.js
//
// Uso manual:
//   node scraper/refrescar-calendario.js               (todas las competiciones)
//   node scraper/refrescar-calendario.js --competicion 1
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { detectar } = require('./temporada-actual');
const CFG = require('./config');

const args = process.argv.slice(2);
const leerArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const soloComp = leerArg('--competicion');

const correr = (script, argv) => {
  console.log(`\n$ node scraper/${script} ${argv.join(' ')}`);
  execFileSync('node', [`scraper/${script}`, ...argv], { stdio: 'inherit' });
};

// Marca de frescura para el resumen de salud (S17.5.4): registra CUANDO se
// refresco por ultima vez el calendario de la temporada futura de cada
// categoria. El resumen la compara con "ahora" para saber si el canario de
// temporada (que lee esos indices) sigue viendo datos recientes. Se sella al
// refrescar con exito y se borra cuando ya no hay temporada futura que seguir.
const F_ESTADO = path.join('data', 'processed', 'estado.json');
function editarEstado(fn) {
  let estado = { competiciones: {} };
  if (fs.existsSync(F_ESTADO)) { try { estado = JSON.parse(fs.readFileSync(F_ESTADO, 'utf8')); } catch (e) {} }
  estado.calendarios = estado.calendarios || {};
  fn(estado);
  fs.mkdirSync(path.dirname(F_ESTADO), { recursive: true });
  fs.writeFileSync(F_ESTADO, JSON.stringify(estado, null, 1));
}
const sellarCalendario = (nombre, temporada) =>
  editarEstado(e => { e.calendarios[nombre] = { temporada, actualizado: new Date().toISOString() }; });
const limpiarCalendario = nombre =>
  editarEstado(e => { delete e.calendarios[nombre]; });

(async () => {
  const comps = Object.keys(CFG.COMPETICIONES); // ['1','2','3']
  let refrescadas = 0;

  for (const g of comps) {
    if (soloComp && g !== String(soloComp)) continue;
    const nombre = CFG.COMPETICIONES[g];

    let det;
    try {
      det = await detectar(g);
    } catch (e) {
      console.log(`\n${nombre}: no se pudo detectar temporada (${e.message}). Se omite.`);
      continue;
    }

    if (!det.discrepancia || det.maxima === det.temporada) {
      console.log(`\n${nombre}: temporada estable (${det.temporada}). ` +
        `El scrape normal ya la cubre, no hay calendario futuro que refrescar.`);
      limpiarCalendario(nombre); // no hay futuro que seguir: el resumen no debe vigilar su frescura
      continue;
    }

    console.log(`\n===== ${nombre}: refrescando calendario de la temporada ${det.maxima} ` +
      `(seleccionada: ${det.temporada}) =====`);
    // 1) Actualizar los índices de la temporada máxima. Como no hay actas
    //    (partidos sin jugar), scrape.js solo baja los _indice.json: es barato.
    correr('scrape.js', ['--competicion', g, '--temporada', det.maxima]);
    // 2) Regenerar el calendario desde esos índices (idempotente).
    correr('calcular-calendario.js', ['--temporada', det.maxima, '--competicion', g]);
    sellarCalendario(nombre, det.maxima); // ambos pasos salieron bien: registrar la frescura
    refrescadas++;
  }

  console.log(`\n${refrescadas} competición(es) con calendario refrescado.`);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
