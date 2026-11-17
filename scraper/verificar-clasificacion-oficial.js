// Nuestra clasificacion contra la OFICIAL de la FEB, grupo a grupo (lote 36).
//
// La clasificacion es la tabla mas leida del sitio y hasta el 17/11/2026 nada la
// vigilaba: con el regimen de desempate de segunda vuelta aplicado desde la J2 y
// sin el porcentaje del articulo 79, Tercera B-B daba un lider equivocado. La
// FEB publica su orden en la misma resultados.aspx que ya scrapeamos
// (clasificacionDataGrid), asi que tenemos una fuente autoritativa contra la
// que compararnos cada semana -- el mismo idiom que los parciales del HTML
// contra el acta.
//
// Para cada grupo lee la tabla oficial de la jornada que la FEB muestra (la
// ultima disputada), calcula la nuestra a esa misma jornada con
// web/src/ordenClasificacion.js (el mismo codigo que pinta la app) y compara:
//   - datos (PJ/PG/PP/PF/PC por equipo, cruzando por id de equipo): si no
//     cuadran, la diferencia es de entrada (un partido que una fuente tiene y
//     la otra no), no de orden, y el orden no se juzga.
//   - orden: con los datos cuadrando, cada posicion distinta es un fallo nuestro.
//
// Escribe data/processed/clasificacion-oficial.json (lo lee resumen-salud.js) y
// sale con 1 si algun grupo tiene el orden mal.
//
// Uso: node scraper/verificar-clasificacion-oficial.js [--competicion 3] [--temporada 2024] [--salida f.json]
// Coste: 1 GET + 1 postback por grupo que no venga ya mostrado (~13 en total).
const fs = require('fs');
const path = require('path');
const CFG = require('./config');
const { crearSesion, cargarInicial, postback, extraerForm, nombreCortoGrupo } = require('./scrape');

const pausa = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const iC = args.indexOf('--competicion');
const SOLO = iC >= 0 ? [String(args[iC + 1])] : Object.keys(CFG.COMPETICIONES);
// --temporada: cruza una temporada concreta (p.ej. una cerrada) sin tocar el
// JSON del pipeline, que es solo de la temporada en curso.
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? String(args[iT + 1]) : null;
// --salida: escribe el detalle (con las filas oficiales completas) a ese fichero.
const iS = args.indexOf('--salida');
const SALIDA = iS >= 0 ? args[iS + 1] : null;
const leerJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };

const DDL = '_ctl0:MainContentPlaceHolderMaster:';
const sel = id => `#_ctl0_MainContentPlaceHolderMaster_${id}`;
const entero = t => parseInt(String(t).replace(/[^\d-]/g, ''), 10);

// Las columnas se leen por su cabecera, no por posicion: la FEB no publica las
// mismas en todas las temporadas (2026/27 trae DIF y %, 2025/26 trae PT y no %;
// lote 37). Las que no son de las cinco que se comparan se guardan tal cual.
function leerTablaOficial($) {
  const filas = [];
  let cabecera = null;
  $(sel('clasificacionDataGrid')).find('tr').each((i, tr) => {
    const c = $(tr).find('td, th').map((j, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
    const href = $(tr).find('a[href*="Equipo.aspx"]').attr('href') || '';
    const id = (href.match(/[?&]i=(\d+)/) || [])[1];
    if (!id) { if (!cabecera && c.length >= 8) cabecera = c.map(h => h.toUpperCase()); return; }
    if (c.length < 8) return;
    const col = (nombre, porDefecto) => { const k = cabecera ? cabecera.indexOf(nombre) : -1; return c[k >= 0 ? k : porDefecto]; };
    const otras = {};
    (cabecera || []).forEach((h, k) => { if (!['PO', 'EQUIPO', 'PJ', 'PG', 'PP', 'PF', 'PC'].includes(h)) otras[h || `col${k}`] = c[k]; });
    filas.push({
      pos: entero(col('PO', 0)), id, nombre: col('EQUIPO', 1),
      pj: entero(col('PJ', 2)), pg: entero(col('PG', 3)), pp: entero(col('PP', 4)),
      pf: entero(col('PF', 5)), pc: entero(col('PC', 6)), otras,
    });
  });
  const jornadaTxt = $(`${sel('jornadasDropDownList')} option[selected]`).text().trim();
  return { filas, cabecera, jornada: entero((jornadaTxt.match(/jornada\s*(\d+)/i) || [])[1]), jornadaTxt };
}

function compararGrupo(oficial, nuestra) {
  const nuestraPorId = new Map(nuestra.map((e, i) => [e.id, { ...e, pos: i + 1 }]));
  const datosDistintos = [];
  for (const o of oficial) {
    const n = nuestraPorId.get(o.id);
    if (!n) { datosDistintos.push(`${o.nombre}: no esta en nuestra tabla`); continue; }
    const campos = ['pj', 'pg', 'pp', 'pf', 'pc'].filter(k => o[k] !== n[k]);
    if (campos.length) datosDistintos.push(`${o.nombre}: ${campos.map(k => `${k} ${n[k]}≠${o[k]}`).join(', ')}`);
  }
  if (nuestra.length !== oficial.length) datosDistintos.push(`equipos: nosotros ${nuestra.length}, FEB ${oficial.length}`);
  const posicionesMal = oficial
    .filter(o => nuestraPorId.get(o.id) && nuestraPorId.get(o.id).pos !== o.pos)
    .map(o => ({ pos: o.pos, oficial: o.nombre, nosotros: nuestra[o.pos - 1]?.nombre ?? null }));
  return { datosDistintos, posicionesMal };
}

async function main() {
  const { ordenarClasificacion, totalJornadasGrupo, numJornada } = await import('../web/src/ordenClasificacion.js');
  const estado = leerJSON(path.join('data', 'processed', 'estado.json')) || { competiciones: {} };
  const salida = { fecha: new Date().toISOString().slice(0, 10), grupos: [] };

  for (const g of SOLO) {
    const comp = CFG.COMPETICIONES[g];
    const temporada = TEMPORADA || estado.competiciones[comp]?.temporada;
    if (!temporada) { console.log(`${comp}: sin temporada en estado.json, salto`); continue; }
    const partidos = leerJSON(path.join('data', 'processed', comp, temporada, 'partidos.json')) || [];
    const calendario = leerJSON(path.join('data', 'processed', comp, temporada, 'calendario.json'));

    const sesion = crearSesion(temporada, g);
    let $ = await cargarInicial(sesion);
    await pausa(CFG.PAUSA_MS);
    const grupos = [];
    $(`${sel('gruposDropDownList')} option`).each((i, opt) => {
      const nombre = $(opt).text().trim();
      if (CFG.FILTRO_GRUPOS.test(nombre)) grupos.push({ id: $(opt).attr('value'), corto: nombreCortoGrupo(nombre) });
    });

    for (const grupo of grupos) {
      if ($(`${sel('gruposDropDownList')} option[selected]`).attr('value') !== grupo.id) {
        const form = extraerForm($);
        form[DDL + 'temporadasDropDownList'] = temporada;
        form[DDL + 'gruposDropDownList'] = grupo.id;
        $ = await postback(sesion, form, DDL + 'gruposDropDownList');
        await pausa(CFG.PAUSA_MS);
      }
      const { filas, cabecera, jornada, jornadaTxt } = leerTablaOficial($);
      const reg = { competicion: comp, temporada, grupo: grupo.corto, jornada, equipos: filas.length, cabecera };
      if (SALIDA) reg.oficial = filas;
      if (!filas.length || !jornada) {
        reg.error = `sin tabla oficial legible (jornada "${jornadaTxt}", ${filas.length} filas)`;
        salida.grupos.push(reg);
        console.log(`⚠ ${comp} ${grupo.corto}: ${reg.error}`);
        continue;
      }
      const delGrupo = partidos.filter(p => p.grupo === grupo.corto);
      const calGrupo = calendario?.partidos?.filter(p => p.grupo === grupo.corto);
      const nuestra = ordenarClasificacion(delGrupo, { jornada, totalJornadas: totalJornadasGrupo(delGrupo, calGrupo) });
      Object.assign(reg, compararGrupo(filas, nuestra));
      reg.ultimaJornadaNuestra = delGrupo.reduce((m, p) => Math.max(m, numJornada(p.jornada)), 0);
      salida.grupos.push(reg);

      const marca = reg.datosDistintos.length ? '≈' : reg.posicionesMal.length ? '✗' : '✓';
      console.log(`${marca} ${comp} ${grupo.corto} J${jornada}: ` +
        (reg.datosDistintos.length
          ? `datos distintos (${reg.datosDistintos.length}), el orden no se juzga -> ${reg.datosDistintos.slice(0, 3).join(' · ')}`
          : `${reg.posicionesMal.length} de ${filas.length} posiciones distintas`));
      for (const m of reg.datosDistintos.length ? [] : reg.posicionesMal)
        console.log(`     ${m.pos}. FEB ${m.oficial} | nosotros ${m.nosotros}`);
    }
  }

  const conOrdenMal = salida.grupos.filter(r => !r.error && !r.datosDistintos.length && r.posicionesMal.length);
  const comparados = salida.grupos.filter(r => !r.error && !r.datosDistintos.length);
  salida.resumen = {
    grupos: salida.grupos.length,
    comparados: comparados.length,
    conDatosDistintos: salida.grupos.filter(r => r.datosDistintos?.length).length,
    sinTabla: salida.grupos.filter(r => r.error).length,
    gruposConOrdenMal: conOrdenMal.length,
    posicionesMal: conOrdenMal.reduce((s, r) => s + r.posicionesMal.length, 0),
  };
  // Un verificador que no compara nada no es un verificador: si ningun grupo
  // llego a compararse, se dice en voz alta.
  if (!comparados.length) salida.resumen.vacio = true;
  if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1) + '\n');
  if (!TEMPORADA) fs.writeFileSync(path.join('data', 'processed', 'clasificacion-oficial.json'), JSON.stringify(salida, null, 1) + '\n');
  console.log(`\n${JSON.stringify(salida.resumen)}`);
  process.exit(conOrdenMal.length || !comparados.length ? 1 : 0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
