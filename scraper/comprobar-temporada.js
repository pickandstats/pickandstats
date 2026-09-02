// Canario de transicion de temporada. Falla (exit 1) SOLO cuando la temporada
// nueva ya ha empezado (tiene partidos jugados) y la FEB sigue seleccionando la
// anterior: en ese estado el pipeline scrapea y publica una temporada cerrada
// como si fuera la vigente, reescribiendo estado.json con un "actualizado hoy"
// enganoso y sin ningun otro error visible (ver ARQUITECTURA.md S17.2).
//
// NO dispara por el mes: una discrepancia en pretemporada (temporada nueva
// anunciada pero sin partidos aun) es normal y solo se informa. Disparar por
// "mes >= 9" paralizaria la actualizacion semanal durante semanas mientras todo
// esta sano; la senal correcta es que la temporada maxima ya tiene resultados.
//
// Como sabe si la nueva ya empezo: mira los _indice.json de la temporada maxima,
// que baja refrescar-calendario.js (un partido jugado trae marcador en su
// resultado). Esos indices son los de la ultima ejecucion, asi que el canario
// puede tardar hasta una semana en dispararse tras el primer partido — margen
// aceptable y del lado seguro (nunca bloquea de mas).
//
// Pensado para el workflow, SIN continue-on-error. Cuando la FEB mueva su
// selector a la temporada nueva, la discrepancia desaparece y pasa a verde solo.
//
// Uso: node scraper/comprobar-temporada.js
const fs = require('fs');
const path = require('path');
const CFG = require('./config');
const { detectar } = require('./temporada-actual');

// Cuenta partidos con resultado (marcador tipo "87-76") en los _indice.json de
// una temporada. Devuelve -1 si no hay indices en disco (no se puede saber).
function partidosJugados(compNombre, temporada) {
  const dir = path.join('data', 'raw', compNombre, temporada);
  if (!fs.existsSync(dir)) return -1;
  let indices = 0, jugados = 0;
  for (const grupo of fs.readdirSync(dir)) {
    const f = path.join(dir, grupo, '_indice.json');
    if (!fs.existsSync(f)) continue;
    indices++;
    let arr;
    try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
    for (const p of (Array.isArray(arr) ? arr : [])) {
      if (/\d+\s*-\s*\d+/.test(p.resultado || '')) jugados++;
    }
  }
  return indices ? jugados : -1;
}

(async () => {
  const conflictos = [];   // temporada nueva ya empezada + FEB en la anterior
  const enPretemporada = []; // discrepancia pero sin partidos aun: normal

  for (const g of Object.keys(CFG.COMPETICIONES)) {
    const nombre = CFG.COMPETICIONES[g];
    let r;
    try {
      r = await detectar(g);
    } catch (e) {
      // Un fallo de deteccion (red, HTML cambiado) NO tumba el canario: su
      // trabajo es la transicion de temporada, no la disponibilidad de la FEB.
      console.log(`${nombre.padEnd(12)} no se pudo detectar (${e.message}) — se omite`);
      continue;
    }

    if (!r.discrepancia) {
      console.log(`${nombre.padEnd(12)} seleccionada ${r.temporada} (${r.etiqueta})  ok`);
      continue;
    }

    const jugados = partidosJugados(nombre, r.maxima);
    const detalle = jugados < 0 ? 'sin indices de la ' + r.maxima + ' en disco'
      : jugados + ' partidos jugados en la ' + r.maxima;
    console.log(`${nombre.padEnd(12)} seleccionada ${r.temporada}, existe la ${r.maxima} sin seleccionar` +
      `  (${detalle})`);

    if (jugados > 0) conflictos.push({ nombre, ...r, jugados });
    else enPretemporada.push({ nombre, ...r });
  }
  console.log('');

  if (conflictos.length) {
    const { temporada, maxima } = conflictos[0];
    console.error('❌ LA TEMPORADA NUEVA YA EMPEZO Y EL PIPELINE SIGUE EN LA ANTERIOR.');
    console.error('');
    console.error('La ' + maxima + ' ya tiene partidos jugados, pero la web de la FEB sigue');
    console.error('seleccionando la ' + temporada + '. El pipeline usa la SELECCIONADA, asi que');
    console.error('scrapearia y publicaria la ' + temporada + ' (cerrada) como si fuera la vigente:');
    console.error('los datos quedarian congelados y la app anunciaria "actualizado hoy" sobre una');
    console.error('temporada terminada, sin ningun otro error visible.');
    console.error('');
    console.error('Que hacer: arranca la ' + maxima + ' — actualiza TEMPORADA_DEFECTO en');
    console.error('scraper/config.js (o lanza el pipeline con --temporada ' + maxima + ') hasta que');
    console.error('la FEB mueva su selector.');
    console.error('');
    conflictos.forEach(c => console.error(`  · ${c.nombre}: ${c.jugados} partidos jugados en la ${c.maxima}`));
    process.exit(1);
  }

  if (enPretemporada.length) {
    console.log('Discrepancia de pretemporada (temporada nueva anunciada, sin partidos aun): normal.');
    console.log('No se bloquea. El canario disparara cuando la ' + enPretemporada[0].maxima + ' tenga resultados.');
  } else {
    console.log('Sin discrepancias: la temporada seleccionada es la mas reciente en las tres categorias.');
  }
})().catch(e => { console.error('Error inesperado en el canario de temporada:', e.message); process.exit(1); });
