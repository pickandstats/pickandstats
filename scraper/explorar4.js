// Explorador 4: grupo E-A -> jornadas -> IDs de partido
const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://baloncestoenvivo.feb.es/resultados.aspx?g=3&t=2025';
const GRUPO_EA = '88891';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};
const pausa = ms => new Promise(r => setTimeout(r, ms));

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
  // 1. Carga inicial
  const res0 = await axios.get(BASE, { headers: HEADERS });
  const cookies = (res0.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  let $ = cheerio.load(res0.data);
  let form = extraerForm($);

  // 2. Seleccionar grupo E-A
  form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = '2025';
  form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = GRUPO_EA;
  const htmlGrupo = await postback(cookies, form, '_ctl0:MainContentPlaceHolderMaster:gruposDropDownList');
  $ = cheerio.load(htmlGrupo);

  // 3. Listar jornadas del grupo
  const jornadas = [];
  $('#_ctl0_MainContentPlaceHolderMaster_jornadasDropDownList option').each((i, opt) => {
    jornadas.push({ id: $(opt).attr('value'), nombre: $(opt).text().trim() });
  });
  console.log(`Jornadas del grupo E-A: ${jornadas.length}`);
  jornadas.slice(0, 5).forEach(j => console.log(`  ${j.id} | ${j.nombre}`));
  if (jornadas.length > 5) console.log('  ...');

  // 4. Recorrer las 3 primeras jornadas y extraer partidos
  for (const jornada of jornadas.slice(0, 3)) {
    await pausa(1000);
    form = extraerForm($);
    form['_ctl0:MainContentPlaceHolderMaster:temporadasDropDownList'] = '2025';
    form['_ctl0:MainContentPlaceHolderMaster:gruposDropDownList'] = GRUPO_EA;
    form['_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList'] = jornada.id;
    const htmlJornada = await postback(cookies, form, '_ctl0:MainContentPlaceHolderMaster:jornadasDropDownList');
    $ = cheerio.load(htmlJornada);

    const partidos = new Set();
    $('a[href*="partido"]').each((i, a) => partidos.add($(a).attr('href')));
    console.log(`\n${jornada.nombre}: ${partidos.size} partidos`);
    [...partidos].forEach(p => console.log('   ', p));
  }
}

main().catch(err => console.error('Error:', err.message));
