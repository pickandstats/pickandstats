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
// Y hay un caso que NINGUNA de esas dos lecturas ve: si `desplegar.yml` falla
// pero el repo no ha cambiado desde el ultimo despliegue bueno, el desfase es
// cero y el latido sigue fresco -- todo verde, y es verdad, hasta que lleguen
// datos nuevos y no tengan donde publicarse (S17.10: era el agujero que tapaba
// el correo de notificacion de Actions, antes de que veinte avisos identicos
// por el mismo fallo repetido lo volvieran ruido y las issues reales de este
// vigilante se perdieran debajo). Por eso la primera comprobacion de `main()`
// lee la `conclusion` de la ultima ejecucion COMPLETADA de `desplegar.yml`
// directamente por la API de GitHub -- nunca el listado ni la duracion
// renderizada, que ya nos engañaron antes (ver ARQUITECTURA.md S17.7).
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
const UMBRAL_HORAS_DESPLIEGUE = 12; // el despliegue corre cada 6h; con 12h de margen,
                                     // un ciclo perdido no abre issue pero dos si.
                                     // Antes era 48h sobre una metrica rota (ver mas
                                     // abajo, issue #9): con esa metrica nunca hacia
                                     // nada, porque el numero nunca pasaba por valores
                                     // pequenos.
const URL_DESPLEGADO = 'https://pickandstats.es/app/data/estado.json';
const TITULO_ALARMA_LATIDO = '🔴 Vigilante: el pipeline de datos no se ha ejecutado';
const TITULO_ALARMA_DESPLIEGUE = '🔴 Vigilante: el sitio desplegado no recibe los datos';
const TITULO_ALARMA_PUBLICACION = '🔴 Vigilante: el sitio no puede publicar cambios nuevos';

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

// La ultima ejecucion COMPLETADA de desplegar.yml, leida por `conclusion` del
// campo que GitHub ya calcula -- nunca por el listado ni por la duracion
// renderizada: esa lectura ya nos engaño dos veces este mes (ver ARQUITECTURA.md
// S17.7, "el estreno del 28/9 salio bien" era falso leido asi). `--status
// completed` descarta ejecuciones en curso, que no tienen conclusion todavia.
function ultimoDespliegueCompletado() {
  const salida = gh(['run', 'list', '--workflow=desplegar.yml', '--status', 'completed',
    '--limit', '1', '--json', 'databaseId,conclusion,createdAt']);
  const lista = JSON.parse(salida);
  return lista[0] || null;
}

// Bug encontrado el 20/10 (issue #9, falso positivo real: "165.9 horas" sobre una
// publicacion pendiente de verdad de 1h48m). La version vieja media la DISTANCIA
// ENTRE DOS LATIDOS (actualizadoRepo - actualizadoDesplegado), no cuanto llevaba sin
// publicarse. Y como el latido del repo se reescribe una vez por semana "haya datos
// nuevos o no" (ver cabecera de resumen-salud.js), en cuanto entra el commit del
// lunes ese numero salta de 0 a ~168h de golpe y se queda ahi hasta que un despliegue
// publique -- nunca pasa por valores pequenos, asi que ningun umbral servia. Esta
// version usa reloj de pared (ahora, que por defecto es Date.now() pero se puede fijar
// en la prueba), igual que la comprobacion de frescura de mas abajo: solo cuenta si
// hay algo pendiente de publicar, y mide desde cuando -- no la distancia entre dos
// marcas que avanzan a ritmos distintos.
function publicacionPendiente(actualizadoRepo, actualizadoDesplegado, ahora = Date.now()) {
  const pendiente = actualizadoDesplegado < actualizadoRepo;
  const horasPendiente = pendiente ? (ahora - actualizadoRepo.getTime()) / 3600000 : 0;
  return { pendiente, horasPendiente };
}

function issueAbierta(titulo) {
  const lista = JSON.parse(gh(['issue', 'list', '--state', 'open', '--json', 'number,title']));
  return lista.find(i => i.title === titulo) || null;
}

// Abrir una issue no notifica a quien no esta mirando (visto de verdad: #5 y
// #6 estuvieron 4 dias sin que nadie las viera, pese al comentario con la
// cifra que empeora que esta funcion ya hacia). Asignarla SI notifica siempre
// -- aparece en "Assigned to you", que es una lista que se mira -- y el
// @-mention en el cuerpo es la segunda vía, independiente de la primera.
const ASIGNAR_A = 'pickandstats';

function abrirOActualizar(titulo, cuerpo, mensajeRepetido) {
  const existente = issueAbierta(titulo);
  if (existente) {
    gh(['issue', 'comment', String(existente.number), '--body', `${mensajeRepetido}\n\n${cuerpo}`]);
    console.log(`⚠ Alarma ya abierta (issue #${existente.number}), actualizada en vez de duplicada.`);
  } else {
    const cuerpoConMencion = `@${ASIGNAR_A}\n\n${cuerpo}`;
    const salida = gh(['issue', 'create', '--title', titulo, '--body', cuerpoConMencion, '--assignee', ASIGNAR_A]);
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

  // --- Requisito previo a apagar el correo de Actions: el caso que ese correo veia
  // y el latido no ve. Si desplegar.yml falla pero el repo no ha cambiado desde el
  // ultimo despliegue bueno, el desfase repo<->desplegado es cero y el latido sigue
  // fresco: las dos comprobaciones de abajo dicen que todo esta bien, y es verdad...
  // hasta que lleguen datos nuevos y no tengan donde publicarse. Es la misma mina
  // armada del 5 de octubre, un instante antes de explotar.
  try {
    const ultimoDespliegue = ultimoDespliegueCompletado();
    if (!ultimoDespliegue) {
      console.log('⚠ No se encontro ninguna ejecucion completada de desplegar.yml.');
    } else if (ultimoDespliegue.conclusion !== 'success') {
      huboFallo = true;
      abrirOActualizar(
        TITULO_ALARMA_PUBLICACION,
        [
          `El sitio no puede publicar: el proximo dato que llegue no saldra.`,
          '',
          `La ultima ejecucion completada de \`desplegar.yml\` (#${ultimoDespliegue.databaseId}, ` +
            `${ultimoDespliegue.createdAt}) termino con conclusion **${ultimoDespliegue.conclusion}**, ` +
            'no `success`.',
          '',
          `Comprueba \`gh run view ${ultimoDespliegue.databaseId} --log-failed\` para ver por que, ` +
            'y relanzalo con `gh run rerun ' + ultimoDespliegue.databaseId + '` si el fallo ya esta arreglado.',
        ].join('\n'),
        'Sigue sin resolverse: la ultima ejecucion completada de `desplegar.yml` sigue sin `success`.'
      );
    } else {
      cerrarSiExiste(
        TITULO_ALARMA_PUBLICACION,
        `Resuelto: la ultima ejecucion completada de \`desplegar.yml\` (#${ultimoDespliegue.databaseId}) ` +
          'termino con `success`.'
      );
      console.log(`✓ Ultimo despliegue completado (#${ultimoDespliegue.databaseId}) con conclusion success.`);
    }
  } catch (e) {
    // Un fallo al preguntar no es lo mismo que "todo va bien" -- misma regla que el
    // fetch del desplegado, de abajo.
    huboFallo = true;
    console.error(`❌ No se pudo leer el historial de desplegar.yml: ${e.message}`);
    abrirOActualizar(
      TITULO_ALARMA_PUBLICACION,
      `No se ha podido consultar el historial de \`desplegar.yml\` via \`gh run list\`: **${e.message}**.`,
      'Sigue sin poder consultarse.'
    );
  }

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
    const { pendiente, horasPendiente } = publicacionPendiente(actualizadoRepo, actualizadoDesplegado);

    console.log(`Latido del repo: ${estado.actualizado}`);
    console.log(`Latido desplegado: ${desplegado.actualizado}` +
      (pendiente ? ` (pendiente de publicar desde hace ${horasPendiente.toFixed(1)}h)` : ' (al dia)'));

    if (horasPendiente > UMBRAL_HORAS_DESPLIEGUE) {
      huboFallo = true;
      abrirOActualizar(
        TITULO_ALARMA_DESPLIEGUE,
        [
          `El sitio desplegado lleva **${horasPendiente.toFixed(1)} horas** con una publicacion ` +
            `pendiente, por encima del umbral de ${UMBRAL_HORAS_DESPLIEGUE}h.`,
          '',
          `- Repo (dato mas nuevo): ${estado.actualizado}`,
          `- Desplegado: ${desplegado.actualizado}`,
          '',
          'Probablemente `desplegar.yml` no ha corrido tras el ultimo commit de datos, o ha',
          'fallado varias veces seguidas. Comprueba `gh run list --workflow=desplegar.yml',
          '--limit 5`, y si falta la ejecucion, lanzala a mano con `gh workflow run desplegar.yml`.',
        ].join('\n'),
        `Sigue sin resolverse: la publicacion lleva pendiente **${horasPendiente.toFixed(1)} horas**.`
      );
    } else {
      cerrarSiExiste(
        TITULO_ALARMA_DESPLIEGUE,
        pendiente
          ? `Resuelto: la publicacion estaba pendiente ${horasPendiente.toFixed(1)}h, por debajo del umbral de ${UMBRAL_HORAS_DESPLIEGUE}h.`
          : 'Resuelto: el desplegado esta al dia con el repo.'
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

module.exports = { publicacionPendiente };

// Permite requerir publicacionPendiente() desde una prueba (ver
// test/verificar-vigilante-publicacion.js) sin disparar main(), que hace
// peticiones reales a GitHub y a la web desplegada.
if (require.main === module) main();
