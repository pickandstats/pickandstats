// Vigilante del latido del pipeline de datos (ver .github/workflows/vigilante.yml).
//
// resumen-salud.js corre DENTRO del job semanal de datos: si GitHub descarta esa
// ejecucion programada bajo carga (ocurre, esta documentado), no hay job, no hay
// alarma, y los datos se quedan rancios sin que nadie se entere. Este script corre
// en un workflow SEPARADO que solo lee el latido que el pipeline ya escribe — no
// reconstruye nada.
//
// El latido es `estado.actualizado` (campo de nivel superior en
// data/processed/estado.json). scrape.js lo reescribe al final de CADA ejecucion
// con exito, haya datos nuevos o no — las semanas en blanco tambien se commitean
// (con el mensaje "Sin datos nuevos, solo estado"). Por eso mide "la ultima vez
// que el pipeline miro", NO "la ultima vez que cambiaron los datos": el pipeline
// corre los 12 meses del año, tambien en pretemporada y fuera de temporada, asi
// que un latido viejo siempre significa lo mismo (la ejecucion no ocurrio),
// independientemente de si habia partidos que procesar. Si esto se "mejora" para
// que compruebe si cambiaron los datos, aparecen falsos positivos en cada semana
// en blanco.
//
// Uso: node scraper/vigilante.js [--simular-retraso N]
//   --simular-retraso N   resta N dias al latido real, SOLO para poder probar la
//                         alarma de punta a punta (incluida la notificacion) sin
//                         esperar a que falle de verdad. No usar en produccion.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UMBRAL_DIAS = 8; // el cron de datos es semanal y puede llegar con horas de
                        // retraso (el 7/9 llego con 6h20m y estaba sano); 7 daria
                        // falsos positivos. A 8, un lunes perdido se ve el miercoles.
const TITULO_ALARMA = '🔴 Vigilante: el pipeline de datos no se ha ejecutado';

const args = process.argv.slice(2);
const iDelay = args.indexOf('--simular-retraso');
const simularRetraso = iDelay >= 0 ? Number(args[iDelay + 1]) || 0 : 0;

const fEstado = path.join('data', 'processed', 'estado.json');
if (!fs.existsSync(fEstado)) {
  console.error('❌ No existe ' + fEstado + ': no se puede leer el latido.');
  process.exit(1);
}
const estado = JSON.parse(fs.readFileSync(fEstado, 'utf8'));
if (!estado.actualizado) {
  console.error('❌ estado.json no tiene el campo "actualizado": no se puede leer el latido.');
  process.exit(1);
}

const edadDiasReal = (Date.now() - new Date(estado.actualizado).getTime()) / 86400000;
const edadDias = edadDiasReal + simularRetraso;

console.log(`Ultimo latido: ${estado.actualizado} (hace ${edadDiasReal.toFixed(1)} dias reales` +
  (simularRetraso ? `, +${simularRetraso} simulados = ${edadDias.toFixed(1)} dias` : '') + ')');

function gh(ghArgs) {
  return execFileSync('gh', ghArgs, { encoding: 'utf8' });
}

function issueAbierta() {
  const lista = JSON.parse(gh(['issue', 'list', '--state', 'open', '--json', 'number,title']));
  return lista.find(i => i.title === TITULO_ALARMA) || null;
}

if (edadDias > UMBRAL_DIAS) {
  const cuerpo = [
    `El latido de \`data/processed/estado.json\` (campo \`actualizado\`) lleva ` +
      `**${edadDias.toFixed(1)} dias** sin avanzar, por encima del umbral de ${UMBRAL_DIAS}.`,
    '',
    'Esto significa que la actualizacion semanal de datos (`actualizar-datos.yml`) no ha',
    'terminado con exito en ese tiempo — probablemente porque GitHub descarto la ejecucion',
    'programada del cron, no porque el pipeline fallara (eso ya lo avisa `resumen-salud.js`',
    'dentro del propio job, en rojo, si llega a correr).',
    '',
    `Ultimo latido real: ${estado.actualizado}.`,
    '',
    'Que mirar: `gh run list --workflow=actualizar-datos.yml --limit 5` para ver si el cron',
    'del lunes corrio. Si no aparece ninguna ejecucion reciente, lanzalo a mano con',
    '`gh workflow run actualizar-datos.yml`.',
    '',
    simularRetraso ? `_(Esta alarma es una prueba: se forzo con --simular-retraso ${simularRetraso}.)_` : ''
  ].filter(Boolean).join('\n');

  const existente = issueAbierta();
  if (existente) {
    gh(['issue', 'comment', String(existente.number), '--body',
      `Sigue sin resolverse: el latido ya lleva **${edadDias.toFixed(1)} dias**.\n\n${cuerpo}`]);
    console.log(`⚠ Alarma ya abierta (issue #${existente.number}), actualizada en vez de duplicada.`);
  } else {
    const salida = gh(['issue', 'create', '--title', TITULO_ALARMA, '--body', cuerpo]);
    console.log(`⚠ Alarma nueva: ${salida.trim()}`);
  }
  console.error(`❌ Latido de ${edadDias.toFixed(1)} dias, por encima del umbral de ${UMBRAL_DIAS}.`);
  process.exit(1);
}

// Latido sano: si habia una alarma viva de una vez anterior, cerrarla — evita
// dejarla abierta para siempre despues de que el pipeline se recupere.
const existente = issueAbierta();
if (existente) {
  gh(['issue', 'comment', String(existente.number), '--body',
    `Resuelto: el latido esta a ${edadDias.toFixed(1)} dias, por debajo del umbral de ${UMBRAL_DIAS}.`]);
  gh(['issue', 'close', String(existente.number)]);
  console.log(`✓ Latido sano (${edadDias.toFixed(1)} dias). Alarma anterior (#${existente.number}) cerrada.`);
} else {
  console.log(`✓ Latido sano: ${edadDias.toFixed(1)} dias, por debajo del umbral de ${UMBRAL_DIAS}.`);
}
