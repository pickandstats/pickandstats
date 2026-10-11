// Reparación en paralelo de los cuartos de las tres temporadas cerradas (2025):
// re-extrae CADA partido a una ubicación paralela (nunca sobrescribe
// data/raw/.../actas/ directamente) y promueve la copia nueva solo si es
// estrictamente mejor que la vieja. Aprobada el 27/9, construida y lanzada el
// 11/10 (ver _informe-jugador-perdido.md, _informe-alcance-real.md,
// _informe-dos-fallos.md, _informe-homoglifos-y-guardian.md para el porqué).
//
// Regla de promoción (la regla validada contra el caso que la motivó —
// 2486858, donde un re-fetch en vivo trajo MENOS datos que la copia vieja—,
// no inventada en abstracto):
//   1. verificarActa primero: si la nueva pasa y la vieja no, gana la nueva.
//      Si la vieja pasa y la nueva no, gana la vieja (nunca se cambia).
//   2. Si las dos pasan o las dos fallan: gana la de más parciales.length
//      (más cuartos es estrictamente más dato). Empate exacto: se queda la
//      vieja, no hay motivo para tocarla.
//   3. Si las dos fallan Y tienen los mismos parciales.length: no se
//      promociona nada, y si ADEMÁS el motivo es que el acta de origen
//      nunca tuvo más de ese corte (parciales.length < 4), es candidata a
//      "incompletos en origen" -- se anota en el informe, no se decide aquí
//      si entra en el registro (eso lo deja dicho un humano, como con
//      2513268 y 2486938).
//
// Reanudable: si ya existe un resultado de comparación para un partido en el
// informe parcial (data/raw-reparado/<comp>/2025/_informe-parcial.json), se
// salta -- no se vuelve a pedir el PDF. Para forzar, borra ese fichero (o la
// carpeta data/raw-reparado entera).
//
// Uso: node scraper/reparar-cuartos-historicos.js [--competicion 1] [--limite N]
const fs = require('fs');
const path = require('path');
const { extraerActaPorCuartos, verificarActa, equiposDesdePorCuarto } = require('./extraer-acta');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const competicionArg = val('--competicion');
const competiciones = competicionArg ? [competicionArg] : ['1', '2', '3'];
const limite = val('--limite') ? parseInt(val('--limite'), 10) : null;
const TEMP = '2025';
const PAUSA_MS = require('./config').PAUSA_MS || 1200;
const pausa = () => new Promise(r => setTimeout(r, PAUSA_MS));

function pasaVerificarActa(parciales, porCuarto) {
  try {
    verificarActa({ parciales, equipos: equiposDesdePorCuarto(porCuarto) }, '');
    return true;
  } catch (e) {
    return false;
  }
}

async function repararCompeticion(comp) {
  const nombre = COMPS[comp];
  const dirViejo = path.join('data', 'raw', nombre, TEMP, 'actas');
  const dirParalelo = path.join('data', 'raw-reparado', nombre, TEMP, 'actas');
  fs.mkdirSync(dirParalelo, { recursive: true });
  const fInforme = path.join('data', 'raw-reparado', nombre, TEMP, '_informe-parcial.json');

  if (!fs.existsSync(dirViejo)) { console.log(nombre + ': no hay actas, se salta'); return []; }
  const ficheros = fs.readdirSync(dirViejo).filter(f => f.endsWith('.json'));
  const partidos = limite ? ficheros.slice(0, limite) : ficheros;

  let informe = [];
  if (fs.existsSync(fInforme)) {
    try { informe = JSON.parse(fs.readFileSync(fInforme, 'utf8')); } catch (e) { informe = []; }
  }
  const yaHechos = new Set(informe.map(r => r.partido));

  console.log(`${nombre} ${TEMP}: ${partidos.length} partidos a comparar, ${yaHechos.size} ya hechos (reanudando)`);

  for (let i = 0; i < partidos.length; i++) {
    const id = partidos[i].replace('.json', '');
    if (yaHechos.has(id)) continue;

    let viejo;
    try { viejo = JSON.parse(fs.readFileSync(path.join(dirViejo, partidos[i]), 'utf8')); }
    catch (e) { continue; }

    const parcialesViejo = viejo.parciales || [];
    const pasaViejo = pasaVerificarActa(parcialesViejo, viejo.porCuarto);

    let nuevo = null, errorNuevo = null;
    try {
      nuevo = await extraerActaPorCuartos(id, null, { verificar: false });
    } catch (e) {
      errorNuevo = e.message;
    }

    let resultado;
    if (!nuevo || !nuevo.final) {
      resultado = { partido: id, decision: 'gana_vieja', motivo: 'la nueva extraccion fallo: ' + (errorNuevo || 'sin datos'), parcialesViejo: parcialesViejo.length, parcialesNuevo: 0, pasaViejo, pasaNuevo: false };
    } else {
      const parcialesNuevo = nuevo.final.parciales || [];
      const pasaNuevo = pasaVerificarActa(parcialesNuevo, nuevo.porCuarto);

      let decision, motivo;
      if (pasaNuevo && !pasaViejo) { decision = 'gana_nueva'; motivo = 'la nueva pasa verificarActa y la vieja no'; }
      else if (pasaViejo && !pasaNuevo) { decision = 'gana_vieja'; motivo = 'la vieja pasa verificarActa y la nueva no'; }
      else if (parcialesNuevo.length > parcialesViejo.length) { decision = 'gana_nueva'; motivo = `empate en verificarActa (${pasaViejo ? 'las dos pasan' : 'las dos fallan'}), la nueva trae mas parciales (${parcialesNuevo.length} > ${parcialesViejo.length})`; }
      else if (parcialesViejo.length > parcialesNuevo.length) { decision = 'gana_vieja'; motivo = `empate en verificarActa, la vieja trae mas parciales (${parcialesViejo.length} > ${parcialesNuevo.length})`; }
      else { decision = 'gana_vieja'; motivo = `empate total (verificarActa y parciales): no se toca`; }

      if (decision === 'gana_nueva') {
        const salida = {
          partido: id, competicion: comp, temporada: TEMP,
          local: nuevo.final.nombreLocal, visitante: nuevo.final.nombreVisitante,
          marcador: nuevo.final.marcador, parciales: nuevo.final.parciales, contexto: nuevo.final.contexto,
          nCuartos: nuevo.cortes.length, completo: nuevo.completo, verificado: pasaNuevo,
          porCuarto: nuevo.porCuarto, contextoPorCuarto: nuevo.contextoPorCuarto,
          generado: new Date().toISOString().slice(0, 10),
        };
        fs.writeFileSync(path.join(dirParalelo, id + '.json'), JSON.stringify(salida, null, 1));
      }

      resultado = { partido: id, decision, motivo, parcialesViejo: parcialesViejo.length, parcialesNuevo: parcialesNuevo.length, pasaViejo, pasaNuevo };
    }

    informe.push(resultado);
    fs.writeFileSync(fInforme, JSON.stringify(informe, null, 1));
    if ((informe.length % 20) === 0) console.log(`  ${nombre}: ${informe.length}/${partidos.length}`);
    await pausa();
  }

  console.log(`${nombre} ${TEMP}: terminado, ${informe.length} comparados`);
  return informe;
}

(async () => {
  const todos = [];
  for (const comp of competiciones) {
    const r = await repararCompeticion(comp);
    todos.push(...r.map(x => ({ ...x, competicion: COMPS[comp] })));
  }

  const promueven = todos.filter(r => r.decision === 'gana_nueva');
  const quedan = todos.filter(r => r.decision === 'gana_vieja');
  const ningunaPasa = todos.filter(r => !r.pasaViejo && !r.pasaNuevo);

  console.log('\n=== REPARTO FINAL ===');
  console.log(`Comparados: ${todos.length}`);
  console.log(`Promueven la copia nueva: ${promueven.length}`);
  console.log(`Se quedan con la vieja: ${quedan.length}`);
  console.log(`Ninguna de las dos pasa verificarActa (candidatas a "incompletos en origen", a revisar a mano): ${ningunaPasa.length}`);
  if (ningunaPasa.length) console.log('  -> ' + ningunaPasa.map(r => r.competicion + '/' + r.partido).join(', '));

  fs.writeFileSync('data/raw-reparado/_resumen-reparacion.json', JSON.stringify({
    generado: new Date().toISOString(),
    totalComparados: todos.length,
    promueven: promueven.length,
    quedan: quedan.length,
    ningunaPasa: ningunaPasa.length,
    detalle: todos,
  }, null, 1));
  console.log('\nResumen completo en data/raw-reparado/_resumen-reparacion.json');
  console.log('IMPORTANTE: esto NO ha tocado data/raw/.../actas todavia. Promover de verdad (copiar');
  console.log('data/raw-reparado/.../actas/*.json sobre data/raw/.../actas/) es un paso aparte,');
  console.log('a mano, despues de revisar el resumen.');
})();
