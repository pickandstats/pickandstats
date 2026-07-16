// Explorador 6: diseccionar la página de un partido (boxscore de jugadores)
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://baloncestoenvivo.feb.es/Partido.aspx?p=2484527';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

async function main() {
  const res = await axios.get(URL, { headers: HEADERS });
  fs.writeFileSync('data/raw/partido_debug.html', res.data);
  console.log('HTML guardado en data/raw/partido_debug.html');
  console.log('Tamaño:', res.data.length, 'caracteres\n');

  const $ = cheerio.load(res.data);

  // Título / marcador
  console.log('=== Título de la página ===');
  console.log($('title').text().trim());

  // Tablas: estructura completa de cabeceras y una fila de muestra
  console.log('\n=== Tablas ===');
  $('table').each((i, t) => {
    const filas = $(t).find('tr').length;
    console.log(`\nTabla ${i} (${filas} filas):`);
    // Cabecera
    const cabecera = [];
    $(t).find('tr').first().find('th, td').each((j, c) => cabecera.push($(c).text().trim()));
    console.log('  Cabecera:', cabecera.join(' | '));
    // Segunda fila como muestra
    const fila2 = [];
    $(t).find('tr').eq(1).find('th, td').each((j, c) => fila2.push($(c).text().trim()));
    if (fila2.length) console.log('  Muestra: ', fila2.join(' | '));
  });

  // Scripts con JSON embebido (por si el boxscore viene en JSON)
  console.log('\n=== Scripts con posible JSON de datos ===');
  $('script').each((i, s) => {
    const contenido = $(s).html() || '';
    if (contenido.includes('{') && (contenido.includes('jugador') || contenido.includes('player') || contenido.includes('boxscore') || contenido.length > 5000)) {
      console.log(`  Script ${i}: ${contenido.length} chars | Empieza: ${contenido.slice(0, 150).replace(/\s+/g, ' ')}`);
    }
  });
}

main().catch(err => console.error('Error:', err.message));
