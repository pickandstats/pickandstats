// Explorador 7: ¿datos en HTML estático o en API JSON del widget?
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

async function main() {
  // PARTE 1: ¿las tablas del HTML guardado tienen datos reales?
  const html = fs.readFileSync('data/raw/partido_debug.html', 'utf8');
  const $ = cheerio.load(html);

  console.log('=== PARTE 1: contenido real de la Tabla 0 (filas 2-5) ===');
  const tabla0 = $('table').eq(0);
  tabla0.find('tr').slice(2, 6).each((i, tr) => {
    const celdas = [];
    $(tr).find('td, th').each((j, c) => celdas.push($(c).text().trim()));
    console.log(`  Fila: ${celdas.join(' | ')}`);
  });

  // PARTE 2: localizar los .js de la página y buscar la API del widget
  console.log('\n=== PARTE 2: scripts externos de la página ===');
  const scripts = [];
  $('script[src]').each((i, s) => scripts.push($(s).attr('src')));
  scripts.forEach(s => console.log('  ', s));

  const widgetJs = scripts.find(s => s.toLowerCase().includes('widget'));
  if (!widgetJs) {
    console.log('\nNo se encontró un .js con "widget" en el nombre. Buscando en todos...');
  }

  const objetivo = widgetJs || scripts.find(s => s.includes('launcher')) || null;
  const aRevisar = objetivo ? [objetivo] : scripts;

  for (let src of aRevisar) {
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = 'https://baloncestoenvivo.feb.es' + src;
    else if (!src.startsWith('http')) src = 'https://baloncestoenvivo.feb.es/' + src;

    try {
      const res = await axios.get(src, { headers: HEADERS });
      const js = res.data;
      // Buscar URLs y rutas de API dentro del JS
      const urls = new Set([
        ...(js.match(/https?:\/\/[^\s"'<>)]+/g) || []),
        ...(js.match(/["']\/[a-zA-Z0-9_\-\/]+\.(?:ashx|asmx|aspx|svc|json)[^"']*/g) || []),
        ...(js.match(/["'][a-zA-Z0-9_\-\/]*(?:api|service|data|boxscore)[a-zA-Z0-9_\-\/]*["']/gi) || [])
      ]);
      if (urls.size) {
        console.log(`\n>>> ${src}`);
        [...urls].slice(0, 25).forEach(u => console.log('    ', u));
      }
    } catch (e) {
      console.log(`\n(No se pudo leer ${src}: ${e.message})`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(err => console.error('Error:', err.message));
