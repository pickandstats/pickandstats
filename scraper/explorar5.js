// Explorador 5: volcar y diseccionar el HTML de una jornada del E-A
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE = 'https://baloncestoenvivo.feb.es/resultados.aspx?g=3&t=2025';
const GRUPO_EA = '88891';
const JORNADA_1 = '662231';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

function extraerForm($) {
  const form = {};
  $('input[type="hidden"]').each((i, el) => {
    form[$(el).attr('name')] = $(el).attr('value') || '';
  });
  return form;
}

async function postback(cookies, form, target) {
  form['__EVENTTARGET'] = target;
  form['__EVENTARGUMENT'] = '';
  const res = await axios.post(BASE, new URLSearchParams(form).toString(), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': BASE
    }
  });
  return res.data;
}

async function main() {
  const res0 = await axios.get(BASE, { headers: HEADERS });
  const cookies = (res0.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  let $ = cheerio.load(res0.data);
  let form = extraerForm($);

  // Seleccionar grupo E-A
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = '2025';
  form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = GRUPO_EA;
  const htmlGrupo = await postback(cookies, form, '_ctl0:MainContentPlaceHolderMaster:gruposDropDownList');
  $ = cheerio.load(htmlGrupo);

  // Seleccionar jornada 1
  await new Promise(r => setTimeout(r, 1000));
  form = extraerForm($);
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = '2025';
  form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = GRUPO_EA;
  form['_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList'] = JORNADA_1;
  const htmlJornada = await postback(cookies, form, '_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList');

  // Guardar el HTML para inspección
  fs.writeFileSync('data/raw/jornada1_EA_debug.html', htmlJornada);
  console.log('HTML guardado en data/raw/jornada1_EA_debug.html');
  console.log('Tamaño:', htmlJornada.length, 'caracteres\n');

  $ = cheerio.load(htmlJornada);

  // ¿Qué jornada quedó seleccionada realmente?
  const jSel = $('#_ctl0_MainContentPlaceHolderMaster_jornadasDropDownList option[selected]').text().trim();
  const gSel = $('#_ctl0_MainContentPlaceHolderMaster_gruposDropDownList option[selected]').text().trim();
  console.log('Grupo seleccionado:', gSel);
  console.log('Jornada seleccionada:', jSel, '\n');

  // TODOS los enlaces de la página
  console.log('=== Todos los href distintos de la página ===');
  const hrefs = new Set();
  $('a').each((i, a) => {
    const h = $(a).attr('href');
    if (h && !h.startsWith('#')) hrefs.add(h);
  });
  [...hrefs].forEach(h => console.log('  ', h));

  // Tablas y sus primeras filas
  console.log('\n=== Tablas encontradas ===');
  $('table').each((i, t) => {
    const filas = $(t).find('tr').length;
    const primeraFila = $(t).find('tr').first().text().replace(/\s+/g, ' ').trim().slice(0, 120);
    console.log(`  Tabla ${i}: ${filas} filas | Primera fila: "${primeraFila}"`);
  });

  // Elementos con onclick (partidos como filas clicables)
  const onclicks = new Set();
  $('[onclick]').each((i, el) => onclicks.add($(el).attr('onclick').slice(0, 100)));
  if (onclicks.size) {
    console.log('\n=== Elementos con onclick ===');
    [...onclicks].slice(0, 10).forEach(o => console.log('  ', o));
  }
}

main().catch(err => console.error('Error:', err.message));
