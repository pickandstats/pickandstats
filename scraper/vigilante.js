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
// El repo puede tener el latido al dia y aun asi el LECTOR ve datos viejos, si
// `desplegar.yml` no corrio tras el commit del bot (pasaba con el GITHUB_TOKEN
// por defecto: GitHub no dispara workflows con sus propios eventos). Por eso
// este script lee TAMBIEN el estado.json desplegado y lo compara con el del
// repo — lo que le importa a un lector es lo que ve, no lo que hay en git.
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
                        // Se mide contra el LATIDO DESPLEGADO, no contra el del repo.
const UMBRAL_HORAS_DESPLIEGUE = 48; // margen para que un despliegue que falle una
                                     // vez y se recupere al dia siguiente no abra issue.
const URL_DESPLEGADO = 'https://pickandstats.es/app/data/estado.json';
const TITULO_ALARMA_LATIDO = '🔴 Vigilante: el pipeline de datos no se ha ejecutado';
const TITULO_ALARMA_DESPLIEGUE = '🔴 Vigilante: el sitio desplegado no recibe los datos';

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

function gh(ghArgs) {
  return execFileSync('gh', ghArgs, { encoding: 'utf8' });
}

function issueAbierta(titulo) {
  const lista = JSON.parse(gh(['issue', 'list', '--state', 'open', '--json', 'number,title']));
  return lista.find(i => i.title === titulo) || null;
}

function abrirOActualizar(titulo, cuerpo, mensajeRepetido) {
  const existente = issueAbierta(titulo);
  if (existente) {
    gh(['issue', 'comment', String(existente.number), '--body', `${mensajeRepetido}\n\n${cuerpo}`]);
    console.log(`⚠ Alarma ya abierta (issue #${existente.number}), actualizada en vez de duplicada.`);
  } else {
    const salida = gh(['issue', 'create', '--title', titulo, '--body', cuerpo]);
    console.log(`⚠ Alarma nueva: ${salida.trim()}`);
  }
}

function cerrarSiExiste(titulo, mensaje) {
  const existente = issueAbierta(titulo);
  if (existente) {
    gh(['issue', 'comment', String(existente.number), '--body', mensaje]);
    gh(['issue', 'close', String(existente.number)]);
    console.log(`✓ Alarma anterior (#${existente.number}) cerrada.`);
  }
}

async function main() {
  let huboFallo = false;

  // --- Segunda lectura: el estado.json desplegado, comparado con el del repo ---
  let desplegado = null;
  let errorFetch = null;
  try {
    const resp = await fetch(URL_DESPLEGADO);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    desplegado = await resp.json();
    if (!desplegado.actualizado) throw new Error('sin campo "actualizado"');
  } catch (e) {
    errorFetch = e;
  }

  if (errorFetch) {
    // Un fetch que falla es tambien una alarma — la web no responde — no un
    // "no puedo comprobar" silencioso. Es la misma regla del canario.
    huboFallo = true;
    console.error(`❌ No se pudo leer el desplegado (${URL_DESPLEGADO}): ${errorFetch.message}`);
    abrirOActualizar(
      TITULO_ALARMA_DESPLIEGUE,
      [
        `No se ha podido leer \`${URL_DESPLEGADO}\`: **${errorFetch.message}**.`,
        '',
        'La web no responde, o no responde con el estado esperado. Esto es una alarma',
        'igual que un desfase — un fallo al comprobar no es lo mismo que "todo va bien".',
      ].join('\n'),
      'Sigue sin responder.'
    );
  } else {
    const actualizadoRepo = new Date(estado.actualizado);
    const actualizadoDesplegado = new Date(desplegado.actualizado);
    const horasDesfase = (actualizadoRepo.getTime() - actualizadoDesplegado.getTime()) / 3600000;

    console.log(`Latido del repo: ${estado.actualizado}`);
    console.log(`Latido desplegado: ${desplegado.actualizado} (desfase de ${horasDesfase.toFixed(1)}h sobre el repo)`);

    if (horasDesfase > UMBRAL_HORAS_DESPLIEGUE) {
      huboFallo = true;
      abrirOActualizar(
        TITULO_ALARMA_DESPLIEGUE,
        [
          `El sitio desplegado va **${horasDesfase.toFixed(1)} horas** por detras del repo, ` +
            `por encima del umbral de ${UMBRAL_HORAS_DESPLIEGUE}h.`,
          '',
          `- Repo: ${estado.actualizado}`,
          `- Desplegado: ${desplegado.actualizado}`,
          '',
          'Probablemente `desplegar.yml` no ha corrido tras el ultimo commit de datos.',
          'Comprueba `gh run list --workflow=desplegar.yml --limit 5`, y si falta la',
          'ejecucion, lanzala a mano con `gh workflow run desplegar.yml`.',
        ].join('\n'),
        `Sigue sin resolverse: el desplegado ya lleva **${horasDesfase.toFixed(1)} horas** por detras.`
      );
    } else {
      cerrarSiExiste(
        TITULO_ALARMA_DESPLIEGUE,
        `Resuelto: el desplegado va ${horasDesfase.toFixed(1)}h por detras del repo, por debajo del umbral de ${UMBRAL_HORAS_DESPLIEGUE}h.`
      );
    }
  }

  // --- Latido del pipeline: medido contra lo DESPLEGADO, que es lo que ve el lector ---
  // Si el fetch fallo no hay fecha desplegada fiable que medir; se salta este
  // check en vez de alarmar dos veces por la misma causa (ya alarmo arriba).
  if (!errorFetch) {
    const actualizadoDesplegado = new Date(desplegado.actualizado);
    const edadDiasReal = (Date.now() - actualizadoDesplegado.getTime()) / 86400000;
    const edadDias = edadDiasReal + simularRetraso;

    console.log(`Frescura (contra lo desplegado): hace ${edadDiasReal.toFixed(1)} dias reales` +
      (simularRetraso ? `, +${simularRetraso} simulados = ${edadDias.toFixed(1)} dias` : ''));

    if (edadDias > UMBRAL_DIAS) {
      huboFallo = true;
      const cuerpo = [
        `El latido desplegado (\`${URL_DESPLEGADO}\`, campo \`actualizado\`) lleva ` +
          `**${edadDias.toFixed(1)} dias** sin avanzar, por encima del umbral de ${UMBRAL_DIAS}.`,
        '',
        'Esto significa que la actualizacion semanal de datos (`actualizar-datos.yml`) no ha',
        'terminado con exito en ese tiempo, o que ha terminado pero no ha llegado a la web',
        '(eso ya deberia haberlo avisado la alarma de despliegue de arriba).',
        '',
        `Ultimo latido desplegado: ${desplegado.actualizado}.`,
        '',
        'Que mirar: `gh run list --workflow=actualizar-datos.yml --limit 5` para ver si el cron',
        'del lunes corrio. Si no aparece ninguna ejecucion reciente, lanzalo a mano con',
        '`gh workflow run actualizar-datos.yml`.',
        '',
        simularRetraso ? `_(Esta alarma es una prueba: se forzo con --simular-retraso ${simularRetraso}.)_` : ''
      ].filter(Boolean).join('\n');

      abrirOActualizar(
        TITULO_ALARMA_LATIDO,
        cuerpo,
        `Sigue sin resolverse: el latido ya lleva **${edadDias.toFixed(1)} dias**.`
      );
    } else {
      cerrarSiExiste(
        TITULO_ALARMA_LATIDO,
        `Resuelto: el latido esta a ${edadDias.toFixed(1)} dias, por debajo del umbral de ${UMBRAL_DIAS}.`
      );
      console.log(`✓ Latido sano: ${edadDias.toFixed(1)} dias, por debajo del umbral de ${UMBRAL_DIAS}.`);
    }
  }

  process.exit(huboFallo ? 1 : 0);
}

main();
