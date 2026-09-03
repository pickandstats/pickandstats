// Detecta la temporada vigente leyendo el desplegable de la web de la FEB.
// Evita tener que editar TEMPORADA_DEFECTO a mano cada septiembre.
// Uso como módulo:  const { detectar } = require('./temporada-actual');
// Uso directo:      node scraper/temporada-actual.js
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

async function detectar(competicion = 3) {
  const url = `${CFG.BASE}/resultados.aspx?g=${competicion}&t=${CFG.TEMPORADA_DEFECTO}`;
  // timeout imprescindible: sin el, una peticion estancada desde el runner de
  // Actions colgaba el proceso indefinidamente (hasta el limite de 6h del job).
  // Como el canario S17.2 es el primer paso y NO es continue-on-error, un cuelgue
  // aqui bloqueaba toda la actualizacion semanal. Con timeout, una peticion mala
  // lanza y los llamadores ya lo toleran (try/catch por categoria). 3 intentos
  // con espera creciente para no rendirse ante un parpadeo transitorio.
  let res, ultimo;
  for (let intento = 1; intento <= 3; intento++) {
    try { res = await axios.get(url, { headers: CFG.HEADERS, timeout: 20000 }); break; }
    catch (e) { ultimo = e; if (intento < 3) await new Promise(r => setTimeout(r, 2000 * intento)); }
  }
  if (!res) throw ultimo;
  const $ = cheerio.load(res.data);
  const opts = $('select[id*="temporadasDropDownList"] option')
    .map((i, o) => ({ valor: $(o).attr('value'), texto: $(o).text().trim(), sel: $(o).attr('selected') != null }))
    .get()
    .filter(o => /^\d{4}$/.test(o.valor));

  if (!opts.length) throw new Error('No se encontró el desplegable de temporadas');

  const seleccionada = opts.find(o => o.sel);
  const maxima = opts.map(o => +o.valor).sort((a, b) => b - a)[0];
  const elegida = seleccionada ? +seleccionada.valor : maxima;

  return {
    temporada: String(elegida),
    etiqueta: (seleccionada || opts.find(o => +o.valor === elegida)).texto,
    maxima: String(maxima),
    discrepancia: elegida !== maxima
  };
}

module.exports = { detectar };

if (require.main === module) {
  (async () => {
    for (const g of Object.keys(CFG.COMPETICIONES)) {
      const r = await detectar(g);
      console.log(CFG.COMPETICIONES[g].padEnd(12) + r.temporada + '  (' + r.etiqueta + ')' +
        (r.discrepancia ? '   ⚠ existe una más reciente: ' + r.maxima : ''));
    }
  })().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
