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
const { execFileSync } = require('child_process');
const CFG = require('./config');

const MAX_DIAS_INDICES = 14;   // >2 refrescos semanales perdidos: el canario esta ciego
const DIAS_ARRANQUE = 42;      // ~6 semanas: ventana de calendarios escalonados (S17.5.4)
const DIAS_ACTA = 10;          // acta que falta para un partido jugado hace mas de esto = extraccion rota
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
  const excl = leerJSON(path.join('web', 'public', 'data', nombre, sel, 'excluidos.json'));
  const excluidos = new Set((Array.isArray(excl) ? excl : []).map(x => String(x.id != null ? x.id : x)));
  if (fs.existsSync(dirSel)) {
    const cuenta = new Map();
    let primerPartido = null;          // fecha mas temprana de la temporada (arranque)
    const jugadosSinActa = [];         // partido jugado hace >DIAS_ACTA sin acta en disco
    for (const grupo of fs.readdirSync(dirSel)) {
      if (grupo === 'actas') continue;   // no es un grupo
      const fi = path.join(dirSel, grupo, '_indice.json');
      if (!fs.existsSync(fi)) continue;
      const arr = leerJSON(fi);
      cuenta.set(grupo, Array.isArray(arr) ? arr.length : 0);
      for (const p of (Array.isArray(arr) ? arr : [])) {
        const f = parseFecha(p.fecha);
        if (f && (!primerPartido || f < primerPartido)) primerPartido = f;
        const jugado = /\d+\s*-\s*\d+/.test(p.resultado || '');
        if (jugado && !excluidos.has(String(p.id)) && f && (Date.now() - f.getTime()) / 86400000 > DIAS_ACTA &&
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
      criticos.push(`${nombre} ${sel}: ${jugadosSinActa.length} acta(s) faltan para partidos jugados hace >${DIAS_ACTA}d -> ${muestra} (¿extraccion de actas rota?)`);
    }
  }

  // 3) Reporte del run de actas (gitignored, efimero): rendidas nuevas y errores.
  const rep = leerJSON(path.join('data', 'processed', 'cuartos-run-' + g + '.json'));
  if (rep) {
    if (rep.nuevasRendidas && rep.nuevasRendidas.length)
      avisos.push(`${nombre}: ${rep.nuevasRendidas.length} acta(s) nuevas rendidas -> ${rep.nuevasRendidas.join(', ')} (laguna permanente)`);
    if (rep.errores && rep.errores.length)
      avisos.push(`${nombre}: ${rep.errores.length} error(es) de extraccion este run (se reintentan)`);
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

if (criticos.length) {
  console.error(`Salud: ${criticos.length} problema(s) critico(s). Revisa arriba.`);
  process.exit(1);
}
console.log(`Salud: OK${avisos.length ? ' (con ' + avisos.length + ' aviso(s))' : ''}.`);
