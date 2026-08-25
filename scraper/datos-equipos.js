// Datos de club (pabellón, dirección, web, teléfono, presidente) desde la ficha
// de equipo de la FEB. Como los datos personales de jugadores, van aparte porque
// apenas cambian: el fichero se amplía con los clubes nuevos en lugar de regenerarse.
//
// Se apoya en data/clubes.json (mapa idsFeb: temporada -> id federativo) para saber
// qué ficha Equipo.aspx?i= pedir por cada club. Indexa por el slug estable del club.
//
// Uso:
//   node scraper/datos-equipos.js --limite 5      (prueba con 5 clubes)
//   node scraper/datos-equipos.js                 (todos los que falten)
//   node scraper/datos-equipos.js --forzar        (revisita los ya conocidos)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

const args = process.argv.slice(2);
const leerArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FORZAR = args.includes('--forzar');
const LIMITE = leerArg('--limite') ? parseInt(leerArg('--limite'), 10) : Infinity;
const PAUSA = CFG.PAUSA_MS || 1200;
const REGISTRO = path.join('data', 'clubes.json');
const DESTINO = path.join('data', 'processed', 'equipos-datos.json');

const pausa = ms => new Promise(r => setTimeout(r, ms));
const REINTENTOS = 3;
const transitorio = e => {
  const c = e.code || '';
  if (['EADDRNOTAVAIL','ECONNRESET','ETIMEDOUT','ENETDOWN','ECONNREFUSED','EAI_AGAIN'].includes(c)) return true;
  const s = e.response && e.response.status;
  return s === 429 || (s >= 500 && s < 600);
};
async function pedir(url) {
  let ultimo;
  for (let i = 1; i <= REINTENTOS; i++) {
    try { return await axios.get(url, { headers: CFG.HEADERS, timeout: 20000 }); }
    catch (e) { ultimo = e; if (!transitorio(e) || i === REINTENTOS) break; await pausa(2000 * i); }
  }
  throw ultimo;
}

// Ordena las claves "comp temp" por temporada descendente y devuelve el id más reciente.
function idFebReciente(idsFeb) {
  const entradas = Object.entries(idsFeb || {});
  if (!entradas.length) return null;
  entradas.sort((a, b) => {
    const ta = (a[0].match(/(\d{4})/) || [])[1] || '0';
    const tb = (b[0].match(/(\d{4})/) || [])[1] || '0';
    return tb.localeCompare(ta);
  });
  return entradas[0][1];
}

const P = '_ctl0_MainContentPlaceHolderMaster_';
const limpiar = t => (t || '').replace(/\s+/g, ' ').trim() || null;
// La web viene a veces como markdown [texto](url); nos quedamos con la url limpia.
function limpiarWeb($) {
  // La FEB deja el texto placeholder "WEB" cuando el club no tiene web.
  const esReal = u => {
    if (!u) return null;
    u = u.trim();
    // Debe tener un dominio con punto (ej. algo.es); descarta "WEB", vacíos, etc.
    if (!/[a-z0-9-]+\.[a-z]{2,}/i.test(u)) return null;
    return u;
  };
  const anchor = ($('#' + P + 'webAnchor').attr('href') || '').trim();
  const desdeAnchor = /^https?:\/\//.test(anchor) ? esReal(anchor) : null;
  if (desdeAnchor) return desdeAnchor;
  const txt = limpiar($('#' + P + 'webLabel').text());
  if (!txt) return null;
  const md = txt.match(/\((https?:\/\/[^)]+)\)/);
  if (md) return esReal(md[1]);
  const url = txt.match(/https?:\/\/\S+/);
  if (url) return esReal(url[0]);
  const www = txt.startsWith('www.') ? 'https://' + txt : txt;
  return esReal(www);
}

function extraer(html) {
  const $ = cheerio.load(html);
  const v = id => limpiar($('#' + P + id).text());
  return {
    direccionClub: v('direccionLabel'),
    telefono: v('telefonoLabel'),
    web: limpiarWeb($),
    presidente: v('presidenteLabel'),
    pabellon: v('pabellonLabel'),
    direccionPabellon: v('dirPabellonLabel'),
  };
}

(async () => {
  const reg = JSON.parse(fs.readFileSync(REGISTRO, 'utf8'));
  const clubes = reg.clubes || [];

  let datos = { actualizado: null, fuente: 'Ficha de equipo en baloncestoenvivo.feb.es', total: 0, equipos: {} };
  if (fs.existsSync(DESTINO)) {
    try { datos = JSON.parse(fs.readFileSync(DESTINO, 'utf8')); } catch {}
    datos.equipos = datos.equipos || {};
  }

  // Clubes a procesar: los que no tengamos aún (o todos si --forzar), con idFeb disponible.
  const pendientes = clubes.filter(c => {
    const idFeb = idFebReciente(c.idsFeb);
    if (!idFeb) return false;
    return FORZAR || !datos.equipos[c.id];
  }).slice(0, LIMITE);

  console.log(`${clubes.length} clubes en registro · ${pendientes.length} a procesar` +
    (LIMITE !== Infinity ? ` (límite ${LIMITE})` : '') + (FORZAR ? ' · forzar' : ''));

  let ok = 0, err = 0;
  for (const c of pendientes) {
    const idFeb = idFebReciente(c.idsFeb);
    const url = `${CFG.BASE}/Equipo.aspx?i=${idFeb}`;
    try {
      const r = await pedir(url);
      const info = extraer(r.data);
      datos.equipos[c.id] = { nombre: c.nombre, idFebUsado: idFeb, ...info };
      ok++;
      const resumen = [info.pabellon, info.direccionPabellon].filter(Boolean).join(' · ').slice(0, 60);
      console.log(`  ✓ ${c.id.padEnd(28)} ${resumen || '(sin datos de campo)'}`);
    } catch (e) {
      err++;
      console.log(`  ✗ ${c.id.padEnd(28)} ERROR ${e.response ? e.response.status : e.code}`);
    }
    await pausa(PAUSA);
  }

  datos.actualizado = new Date().toISOString().slice(0, 10);
  datos.total = Object.keys(datos.equipos).length;
  fs.writeFileSync(DESTINO, JSON.stringify(datos, null, 1));
  console.log(`\nGuardado ${DESTINO}: ${datos.total} equipos (${ok} nuevos, ${err} errores)`);
})();
