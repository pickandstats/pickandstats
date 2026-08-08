const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./scraper/config');
const p = require('path');

(async () => {
  // Un jugador cualquiera con muchos partidos
  const j = require(p.join(process.cwd(), 'data/processed/tercerafeb/2025/jugadores.json'));
  const jug = j.find(x => x.pj > 20);
  console.log('Consultando ficha de:', jug.nombre, '(id ' + jug.idJugador + ')\n');

  const url = `${CFG.BASE}/Jugador.aspx?i=${jug.idJugador}`;
  const res = await axios.get(url, { headers: CFG.HEADERS });
  const $ = cheerio.load(res.data);
  console.log('URL:', url);
  console.log('tamaño:', res.data.length, 'bytes\n');

  // Texto de las primeras zonas informativas
  console.log('=== texto de cabecera ===');
  const txt = $('body').text().replace(/\s+/g, ' ').trim();
  console.log(txt.slice(0, 600));

  console.log('\n=== tablas ===');
  $('table').each((i, t) => {
    if (i > 3) return;
    const $t = $(t);
    console.log(`  tabla ${i}: id=${$t.attr('id') || '-'} · filas ${$t.find('tr').length}`);
    console.log('     cabecera: ' + $t.find('tr').first().text().replace(/\s+/g, ' ').trim().slice(0, 90));
  });
})().catch(e => console.error('Error:', e.message));
