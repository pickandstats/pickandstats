// Lista TODOS los grupos del desplegable de una temporada/competición, sin filtrar.
// Uso: node scraper/listar-grupos.js [--temporada 2025] [--competicion 3]
//   competicion: 1=Primera FEB, 2=Segunda FEB, 3=Tercera FEB (por confirmar)
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';
const iG = args.indexOf('--competicion');
const COMPETICION = iG >= 0 ? args[iG + 1] : CFG.COMPETICION.id;

async function main() {
  const url = `${CFG.BASE}/resultados.aspx?g=${COMPETICION}&t=${TEMPORADA}`;
  console.log(`Consultando g=${COMPETICION}, t=${TEMPORADA}`);
  console.log(url + '\n');
  const res = await axios.get(url, { headers: CFG.HEADERS });
  const $ = cheerio.load(res.data);
  const opciones = $('select[id*="gruposDropDownList"] option');
  if (opciones.length === 0) {
    console.log('⚠️  No se encontró el desplegable de grupos. Puede que g o t no sean válidos.');
    return;
  }
  console.log(`Grupos en el desplegable (${opciones.length}):\n`);
  opciones.each((i, o) => {
    console.log(`  [${$(o).attr('value')}] ${$(o).text().trim()}`);
  });
}
main().catch(e => console.error('Error:', e.message));
