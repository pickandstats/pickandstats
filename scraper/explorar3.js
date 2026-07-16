// Explorador 3: intenta acceder al grupo E-A (88891) por GET y, si no, por postback
const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://baloncestoenvivo.feb.es/resultados.aspx';
const GRUPO_EA = '88891';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

function analizarPagina(html, etiqueta) {
  const $ = cheerio.load(html);
  const grupoSel = $('#_ctl0_MainContentPlaceHolderMaster_gruposDropDownList option[selected]').text().trim();
  const partidos = new Set();
  $('a[href*="partido"]').each((i, a) => partidos.add($(a).attr('href')));
  const equipos = new Set();
  $('a[href*="Equipo.aspx"], a[href*="equipo"]').each((i, a) => equipos.add($(a).text().trim()));

  console.log(`\n--- ${etiqueta} ---`);
  console.log('Grupo seleccionado:', grupoSel || '(no detectado)');
  console.log('Enlaces a partidos:', partidos.size);
  if (partidos.size) [...partidos].slice(0, 5).forEach(p => console.log('   ', p));
  if (equipos.size) {
    console.log('Equipos visibles:', [...equipos].filter(Boolean).slice(0, 16).join(' | '));
  }
  return { grupoSel, nPartidos: partidos.size };
}

async function main() {
  // Intento 1: parámetros GET candidatos
  const candidatos = [
    `${BASE}?g=3&t=2025&f=${GRUPO_EA}`,
    `${BASE}?g=3&t=2025&grupo=${GRUPO_EA}`,
    `${BASE}?g=3&t=2025&fase=${GRUPO_EA}`
  ];

  for (const url of candidatos) {
    try {
      const res = await axios.get(url, { headers: HEADERS });
      const r = analizarPagina(res.data, `GET ${url}`);
      if (r.grupoSel.includes('E-A')) {
        console.log('\n*** El parámetro GET funciona. Scraper será sencillo. ***');
        return;
      }
    } catch (e) {
      console.log(`\n--- GET ${url} --- Error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  // Intento 2: postback ASP.NET
  console.log('\nGET no funcionó. Probando postback ASP.NET...');
  const res0 = await axios.get(`${BASE}?g=3&t=2025`, { headers: HEADERS });
  const $ = cheerio.load(res0.data);
  const cookies = (res0.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const form = {};
  $('input[type="hidden"]').each((i, el) => {
    form[$(el).attr('name')] = $(el).attr('value') || '';
  });
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = '2025';
  form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = GRUPO_EA;
  form['__EVENTTARGET'] = '_ctl0:MainContentPlaceHolderMaster:gruposDropDownList';
  form['__EVENTARGUMENT'] = '';

  const res1 = await axios.post(`${BASE}?g=3&t=2025`, new URLSearchParams(form).toString(), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': `${BASE}?g=3&t=2025`
    }
  });

  const r = analizarPagina(res1.data, 'POSTBACK grupo E-A');
  if (r.grupoSel.includes('E-A') || r.nPartidos > 0) {
    console.log('\n*** El postback funciona. Scraper irá por esta vía. ***');
  } else {
    console.log('\nEl postback no devolvió E-A. Habrá que afinar (pero tiene solución).');
  }
}

main().catch(err => console.error('Error general:', err.message));
