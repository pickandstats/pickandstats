// Resumen de salud del pipeline (ARQUITECTURA.md S17.5 punto 4). Corre EL ULTIMO
// en el workflow, despues del commit/push y SIN continue-on-error: es una alarma,
// no un guardian. Los datos ya se publicaron; ponerse rojo avisa de un problema
// meta (algo que necesita una persona) sin retener datos validos.
//
// Falla (exit 1) solo por lo CRITICO:
//   - una categoria con los cuartos bloqueados (el verificador da "NO generar"),
//   - un grupo sin partidos en la temporada seleccionada teniendo otros grupos,
//   - los indices de la temporada maxima obsoletos (el canario S17.2 quedaria ciego).
// Y AVISA (sin fallar) de: actas nuevas rendidas y errores de extraccion del run.
//
// Todo se deriva de disco; no depende de la salida por terminal de otros pasos.
//
// Uso: node scraper/resumen-salud.js
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const CFG = require('./config');

const MAX_DIAS_INDICES = 14;   // >2 refrescos semanales perdidos: el canario esta ciego
const DIAS_ARRANQUE = 42;      // ~6 semanas: ventana de calendarios escalonados (S17.5.4)
const DIAS_ACTA = 10;          // suelo: por debajo es el retraso normal con que la FEB cierra actas
const DIAS_ACTA_TOPE = 60;     // techo: por encima es laguna historica, no extraccion rota (ventana [10d, 60d])
const criticos = [], avisos = [];
const lineas = [];             // para el resumen legible

const leerJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
// Fecha de partido en los _indice.json (raw): formato dd/mm/yyyy. null si no parsea.
const parseFecha = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };

const estado = leerJSON(path.join('data', 'processed', 'estado.json')) || { competiciones: {} };

for (const g of Object.keys(CFG.COMPETICIONES)) {
  const nombre = CFG.COMPETICIONES[g];
  const sel = estado.competiciones[nombre] && estado.competiciones[nombre].temporada;
  if (!sel) { avisos.push(`${nombre}: sin temporada en estado.json (no evaluado)`); continue; }

  // 1) Cuartos bloqueados: re-ejecutar el verificador (read-only). exit != 0 con
  //    "NO generar" en la salida = bloqueo real; otro exit != 0 = problema de setup.
  try {
    execFileSync('node', ['scraper/verificar-cuartos.js', '--competicion', g, '--temporada', sel], { stdio: 'pipe' });
    lineas.push(`${nombre} ${sel}: cuartos OK`);
  } catch (e) {
    const salida = ((e.stdout || '') + (e.stderr || '')).toString();
    if (/NO generar/.test(salida)) {
      const motivo = (salida.match(/Problemas: (.+?)\./) || [])[1] || 'ver verificador';
      criticos.push(`${nombre} ${sel}: cuartos BLOQUEADOS (${motivo})`);
    } else {
      const prim = salida.split('\n').find(l => l.trim()) || e.message;
      avisos.push(`${nombre} ${sel}: verificar-cuartos salio !=0 (${prim.trim()})`);
    }
  }

  // 2) Grupos sin partidos en la temporada seleccionada (con otros que si tienen)
  const dirSel = path.join('data', 'raw', nombre, sel);
  const dirActas = path.join(dirSel, 'actas');
  // Partidos no disputados (incomparecencias/sanciones): llevan un marcador
  // nominal (0-2, 20-0...) que parece "jugado" pero no tienen boxscore ni acta, y
  // nunca la tendran. Se excluyen del check de actas que faltan usando la lista
  // autoritativa que ya genera calcular.js.
  const excl = leerJSON(path.join('data', 'processed', nombre, sel, 'excluidos.json')); // ver S17.7
  const excluidos = new Set((Array.isArray(excl) ? excl : []).map(x => String(x.id != null ? x.id : x)));
  if (fs.existsSync(dirSel)) {
    const cuenta = new Map();
    let primerPartido = null;          // fecha mas temprana de la temporada (arranque)
    const jugadosSinActa = [];         // partido jugado hace >DIAS_ACTA sin acta en disco
    let fechasSinParsear = 0;          // fechas presentes que no casan dd/mm/yyyy (¿cambio de formato?)
    for (const grupo of fs.readdirSync(dirSel)) {
      if (grupo === 'actas') continue;   // no es un grupo
      const fi = path.join(dirSel, grupo, '_indice.json');
      if (!fs.existsSync(fi)) continue;
      const arr = leerJSON(fi);
      cuenta.set(grupo, Array.isArray(arr) ? arr.length : 0);
      for (const p of (Array.isArray(arr) ? arr : [])) {
        const f = parseFecha(p.fecha);
        if (p.fecha && !f) fechasSinParsear++;   // presente pero ilegible: el check de actas se saltaria
        if (f && (!primerPartido || f < primerPartido)) primerPartido = f;
        const jugado = /\d+\s*-\s*\d+/.test(p.resultado || '');
        // Ventana [DIAS_ACTA, DIAS_ACTA_TOPE]: por debajo del suelo es el retraso
        // normal de la FEB; por encima del techo es laguna historica (no accionable)
        // y NO extraccion rota —lo que hace accionable a un aviso es la recencia, no
        // la temporada—. En temporada cerrada la ventana queda vacia y el check se
        // apaga solo. Ver S17.5.4 y _informe-salud-primera-ejecucion.md.
        const edad = f ? (Date.now() - f.getTime()) / 86400000 : null;
        if (jugado && !excluidos.has(String(p.id)) && edad !== null &&
            edad > DIAS_ACTA && edad <= DIAS_ACTA_TOPE &&
            !fs.existsSync(path.join(dirActas, p.id + '.json'))) jugadosSinActa.push(p.id);
      }
    }
    const valores = [...cuenta.values()];
    if (valores.length && Math.max(...valores) > 0) {
      const vacios = [...cuenta].filter(([, n]) => n === 0).map(([grp]) => grp);
      if (vacios.length) {
        // Critico solo si la temporada ya lleva rodando mas de DIAS_ARRANQUE. En
        // las primeras semanas la FEB publica los calendarios de los grupos de
        // forma escalonada, asi que un indice vacio es legitimo: ponerlo en rojo
        // cada lunes de septiembre taparia las senales reales. Ya rodada la
        // temporada, un grupo vacio si es senal de scraper roto. Discriminante:
        // la fecha del primer partido de la temporada (esta en los _indice.json,
        // tambien para los grupos ya publicados). Sin fecha -> aviso (no bloquea).
        const diasDesdeInicio = primerPartido ? (Date.now() - primerPartido.getTime()) / 86400000 : null;
        const arrancando = diasDesdeInicio === null || diasDesdeInicio <= DIAS_ARRANQUE;
        const msg = `${nombre} ${sel}: grupo(s) sin partidos: ${vacios.join(', ')}`;
        if (arrancando) avisos.push(`${msg} (temporada recien empezada; calendarios escalonados de la FEB)`);
        else criticos.push(`${msg} (¿scraper roto?)`);
      }
    }

    // 2b) Punto ciego cerrado: acta que FALTA para un partido jugado hace mas de
    // DIAS_ACTA. Por debajo del umbral es el retraso normal con que la FEB cierra
    // las actas; por encima, la extraccion esta rota y NADIE MAS lo dice: el
    // verificador da LISTO porque tolera las actas que faltan, y el reporte del
    // run (cuartos-run) ni existe si actas-cuartos.js no llego a correr. Este
    // check no guarda estado entre ejecuciones: se deriva de fecha + existencia.
    if (jugadosSinActa.length) {
      const muestra = jugadosSinActa.slice(0, 8).join(', ') + (jugadosSinActa.length > 8 ? ', ...' : '');
      criticos.push(`${nombre} ${sel}: ${jugadosSinActa.length} acta(s) faltan para partidos jugados hace ${DIAS_ACTA}-${DIAS_ACTA_TOPE}d -> ${muestra} (¿extraccion de actas rota?)`);
    }

    // 2c) Ultima puerta muda de esta pieza: si la FEB cambiara el formato de fecha,
    // parseFecha devolveria null, el check de actas que faltan se saltaria en
    // silencio y el resumen seguiria diciendo OK sin comprobar nada. Un recuento
    // de fechas ilegibles lo hace ruidoso. Aviso, no critico: no rompe nada por si
    // solo, pero avisa de que el check ha quedado ciego.
    if (fechasSinParsear > 0)
      avisos.push(`${nombre} ${sel}: ${fechasSinParsear} fecha(s) de los _indice.json no parsean (¿cambio el formato en la FEB? el check de actas que faltan podria estar ciego)`);
  }

  // 3) Reporte del run de actas (gitignored, efimero): rendidas nuevas y errores.
  const rep = leerJSON(path.join('data', 'processed', 'cuartos-run-' + g + '.json'));
  if (rep) {
    if (rep.nuevasRendidas && rep.nuevasRendidas.length)
      avisos.push(`${nombre}: ${rep.nuevasRendidas.length} acta(s) nuevas rendidas -> ${rep.nuevasRendidas.join(', ')} (laguna permanente)`);
    if (rep.errores && rep.errores.length)
      avisos.push(`${nombre}: ${rep.errores.length} error(es) de extraccion este run (se reintentan)`);
  }

  // 3b) Los ficheros de cuartos se generaron y estan donde se commitean
  // (data/processed, S17.4). Este es un check MENOR: el guardian de verdad —que
  // los cuartos llegan a produccion— vive en desplegar.yml mirando web/dist, que
  // no se mueve con el cambio (verificar-cuartos-desplegados.js). Aqui solo se
  // confirma que la generacion produjo los ficheros, y solo si la categoria tiene
  // cuartos generados (hay actas extraidas); en una temporada recien arrancada sin
  // actas no se exige nada.
  const dirActasSel = path.join('data', 'raw', nombre, sel, 'actas');
  const hayActas = fs.existsSync(dirActasSel) && fs.readdirSync(dirActasSel).some(f => f.endsWith('.json'));
  if (hayActas) {
    const servido = path.join('data', 'processed', nombre, sel);
    const faltan = [];
    for (const f of ['jugadores-cuartos.json', 'equipos-cuartos.json', 'partidos-contexto.json']) {
      const p = path.join(servido, f);
      if (!fs.existsSync(p) || fs.statSync(p).size === 0) faltan.push(f);
    }
    const dirBox = path.join(servido, 'boxscore-cuartos');
    const boxOk = fs.existsSync(dirBox) && fs.readdirSync(dirBox).some(f => f.endsWith('.json'));
    if (!boxOk) faltan.push('boxscore-cuartos/');
    if (faltan.length)
      criticos.push(`${nombre} ${sel}: faltan ficheros de cuartos generados en data/processed: ${faltan.join(', ')} (¿fallo la generacion?)`);
    else
      lineas.push(`${nombre} ${sel}: cuartos generados en data/processed`);
  }

  // 3c) Cobertura real de cuartos: partidos JUGADOS contra partidos con
  // porCuarto con jugadores dentro. El check 3b de arriba solo mira si los
  // ficheros existen y no estan vacios -- no dice si cubren TODOS los
  // partidos jugados, que es justo el agujero que dejo invisible el
  // interbloqueo de S17.7 (el 5/10 esto habria dicho "segundafeb 2026: 13
  // jugados | 0 con cuartos" antes de que el despliegue fallara, en vez de
  // aparecer disfrazado de despliegue roto). Compara contra la cobertura de
  // la semana pasada (persistida en data/processed, committeada como el
  // resto) y FALLA si empeora -- un aviso que no toca el veredicto es
  // decoracion.
  //
  // Comparacion por CONJUNTO DE IDS, no por recuento absoluto (bugfix 20/10,
  // S17.11): el recuento compara huecos absolutos sobre un denominador que
  // crece toda la temporada. Con calidad de extraccion constante, 185
  // partidos con el 97% dan mas huecos absolutos que 124 con el 96% --el
  // guardian diria "EMPEORA" sin que nada hubiera empeorado de verdad. Lo que
  // SI es una regresion real es que un partido que tenia cuartos la semana
  // pasada ya no los tenga: eso es inmune al crecimiento del denominador y es
  // exactamente lo que este guardian existe para cazar.
  const fPartidosSel = path.join('data', 'processed', nombre, sel, 'partidos.json');
  const partidosSel = leerJSON(fPartidosSel);
  if (Array.isArray(partidosSel)) {
    const jugados = partidosSel.filter(p => /\d+\s*-\s*\d+/.test(p.resultado || '')).length;
    const idsConCuartos = new Set();
    if (fs.existsSync(dirActasSel)) {
      for (const f of fs.readdirSync(dirActasSel)) {
        if (!f.endsWith('.json')) continue;
        const a = leerJSON(path.join(dirActasSel, f));
        if (a && (a.porCuarto || []).some(c => c && c.some(eq => eq && (eq.jugadores || []).length))) idsConCuartos.add(f.replace('.json', ''));
      }
    }
    const conCuartos = idsConCuartos.size;
    lineas.push(`${nombre} ${sel}: ${jugados} jugados | ${conCuartos} con cuartos` +
      (jugados ? ` (${(100 * conCuartos / jugados).toFixed(0)}%)` : ''));

    const fCobertura = path.join('data', 'processed', nombre, sel, 'cuartos-cobertura.json');
    const anterior = leerJSON(fCobertura);
    if (anterior && Array.isArray(anterior.idsConCuartos)) {
      const perdidos = anterior.idsConCuartos.filter(id => !idsConCuartos.has(id));
      if (perdidos.length) {
        const muestra = perdidos.slice(0, 8).join(', ') + (perdidos.length > 8 ? ', ...' : '');
        criticos.push(`${nombre} ${sel}: ${perdidos.length} partido(s) que la semana pasada tenian cuartos ya no los tienen -> ${muestra} (¿regresion real?)`);
      }
    } else if (anterior) {
      // Formato viejo (solo recuento, sin la lista de ids): no hay con que
      // comparar conjunto a conjunto esta vez. Se salta sin avisar -- el
      // fichero nuevo de abajo ya deja la lista para la semana que viene.
      console.log(`  (${nombre} ${sel}: base de cobertura en formato antiguo, sin lista de ids; se regenera esta semana)`);
    }
    fs.writeFileSync(fCobertura, JSON.stringify(
      { jugados, conCuartos, idsConCuartos: [...idsConCuartos].sort(), fecha: new Date().toISOString().slice(0, 10) },
      null, 1));
  }
}

// 4) Frescura de los indices de la temporada maxima, de los que depende el
//    canario. La marca la sella refrescar-calendario.js al refrescar con exito;
//    si lleva semanas sin actualizarse, el canario esta ciego.
const cals = estado.calendarios || {};
if (!Object.keys(cals).length) {
  lineas.push('Sin temporada futura rastreada (ninguna categoria en discrepancia).');
} else for (const [nombre, info] of Object.entries(cals)) {
  const edad = (Date.now() - new Date(info.actualizado).getTime()) / 86400000;
  if (!(edad >= 0)) { avisos.push(`Frescura de ${nombre}: marca ilegible (${info.actualizado})`); continue; }
  if (edad > MAX_DIAS_INDICES)
    criticos.push(`Indices de ${nombre} ${info.temporada} sin refrescar hace ${Math.round(edad)}d (>${MAX_DIAS_INDICES}): el canario de temporada podria estar CIEGO`);
  else
    lineas.push(`Indices de ${nombre} ${info.temporada}: frescos (hace ${Math.round(edad)}d)`);
}

// 5) El veredicto de test/regresion.cjs, leido de disco (S17.12, 20/10). Ese
// paso del workflow lleva `continue-on-error: true` A PROPOSITO (los datos
// nuevos son validos aunque la referencia este desactualizada, no hay que
// retenerlos) -- pero eso significa que cuando el script sale con 1, el paso
// aparece VERDE en la API (`conclusion: success`) y el ❌ solo vive en el
// texto del log. Paso asi 6 semanas sin que nadie lo viera (del 9/9 al 20/10,
// ver _informe-auditoria-truncadas.md): un continue-on-error sin canal audible
// no es tolerancia, es un interruptor de apagado. Aqui SI es critico (no
// aviso): no se repite semana a semana como el ruido del despliegue, porque
// arreglarlo es regenerar la referencia a conciencia (dos minutos), no un
// apaño recurrente.
const fRegresion = path.join('data', 'processed', 'regresion-ultimo-resultado.json');
const regresion = leerJSON(fRegresion);
if (!regresion) {
  avisos.push('No existe data/processed/regresion-ultimo-resultado.json: test/regresion.cjs no ha corrido todavia, o no en esta rama.');
} else if (regresion.fallosTotal > 0) {
  criticos.push(`test/regresion.cjs: ${regresion.fallosTotal} diferencia(s) contra la referencia congelada, ` +
    `en ${regresion.camposAfectados.join(', ')} -> revisa si test/referencia.json esta desactualizada ` +
    `(regenerar con test/generar-referencia.cjs) o si es una regresion de verdad.`);
} else {
  lineas.push(`test/regresion.cjs: cuadra con la referencia (comprobado ${regresion.fecha}).`);
}

// --- Salida ---
console.log('\n=== RESUMEN DE SALUD DEL PIPELINE ===\n');
lineas.forEach(l => console.log('  · ' + l));
if (avisos.length) { console.log('\nAVISOS (no bloquean):'); avisos.forEach(a => console.log('  ⚠ ' + a)); }
if (criticos.length) { console.log('\nCRITICOS:'); criticos.forEach(c => console.log('  ❌ ' + c)); }
console.log('');

// Resumen tambien en el panel de GitHub Actions, si esta disponible.
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = ['## Resumen de salud del pipeline', ''];
  lineas.forEach(l => md.push('- ' + l));
  if (avisos.length) { md.push('', '### Avisos'); avisos.forEach(a => md.push('- ⚠ ' + a)); }
  if (criticos.length) { md.push('', '### Críticos'); criticos.forEach(c => md.push('- ❌ ' + c)); }
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n'); } catch (e) {}
}

// Persistir la nueva base de comparacion de la cobertura de cuartos (3c, arriba).
// Bug encontrado el 15/10: este script corre DESPUES del "Commit y push" del
// workflow a proposito (es una alarma, no un guardian, ver cabecera) -- pero eso
// significaba que el fs.writeFileSync de cuartos-cobertura.json de cada
// competicion nunca llegaba al repo: ese commit ya habia pasado. La base se
// quedaba fosilizada en la primera semana que se escribio a mano, y cualquier
// hueco por encima de ESA cifra se marcaba "EMPEORA" para siempre, aunque no
// hubiera crecido desde la semana anterior de verdad (paso el 12/10: critico
// contra una base del 11/10, de antes de que este guardian corriera nunca en
// produccion). Arreglo: este script hace su PROPIO commit, pequeno y aparte,
// solo con los ficheros de cobertura -- se hace siempre, haya criticos o no,
// porque la base tiene que avanzar independientemente de si algo esta mal esta
// semana. Solo en CI (GITHUB_ACTIONS): correr esto en local no debe tocar git.
if (process.env.GITHUB_ACTIONS === 'true') {
  try {
    execSync('git add data/processed/*/*/cuartos-cobertura.json', { stdio: 'pipe' });
    const hayCambios = execSync('git diff --staged --quiet; echo $?').toString().trim() !== '0';
    if (hayCambios) {
      execSync('git commit -m "Cobertura de cuartos: actualizar la base de comparacion"', { stdio: 'pipe' });
      let empujado = false;
      for (let intento = 1; intento <= 3 && !empujado; intento++) {
        try { execSync('git push', { stdio: 'pipe' }); empujado = true; }
        catch (e) {
          console.error(`  (push de la base de cobertura rechazado, intento ${intento}; rebase y reintento)`);
          execSync('git pull --rebase origin main', { stdio: 'pipe' });
        }
      }
      if (!empujado) console.error('  ⚠ No se pudo publicar la base nueva de cuartos-cobertura.json tras 3 intentos -- la proxima comparacion seguira usando la de hoy.');
      else console.log('  (base de cuartos-cobertura.json actualizada y publicada)');
    }
  } catch (e) {
    // avisos/criticos ya se imprimieron arriba -- un aviso empujado aqui no lo
    // veria nadie. Directo a consola, que SI queda en el log del job.
    console.error(`  ⚠ No se pudo commitear cuartos-cobertura.json: ${e.message}`);
  }
}

if (criticos.length) {
  console.error(`Salud: ${criticos.length} problema(s) critico(s). Revisa arriba.`);
  process.exit(1);
}
console.log(`Salud: OK${avisos.length ? ' (con ' + avisos.length + ' aviso(s))' : ''}.`);
