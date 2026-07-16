// Explorador 2: extrae los desplegables (grupos, jornadas) de la página de resultados
const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://baloncestoenvivo.feb.es/resultados.aspx?g=3&t=2025';

async function explorar() {
  console.log('Explorando:', URL, '\n');

  const res = await axios.get(URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(res.data);

  // Listar todos los <select> y sus opciones
  $('select').each((i, sel) => {
    const id = $(sel).attr('id') || $(sel).attr('name') || `select_${i}`;
    console.log(`\n=== SELECT: ${id} ===`);
    $(sel).find('option').each((j, opt) => {
      const value = $(opt).attr('value');
      const text = $(opt).text().trim();
      const selected = $(opt).attr('selected') ? '  <-- seleccionado' : '';
      console.log(`  value="${value}"  |  ${text}${selected}`);
    });
  });

  // Listar enlaces a partidos si los hay
  const partidos = new Set();
  $('a[href*="partido"]').each((i, a) => partidos.add($(a).attr('href')));
  if (partidos.size) {
    console.log('\n=== Enlaces a partidos encontrados ===');
    [...partidos].slice(0, 10).forEach(p => console.log('  ', p));
    console.log(`  (${partidos.size} en total)`);
  } else {
    console.log('\nNo hay enlaces a partidos en esta vista inicial.');
  }
}

explorar().catch(err => console.error('Error:', err.message));
