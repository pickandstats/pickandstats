// Datos personales de jugadores (fecha de nacimiento, nacionalidad, altura) desde
// la ficha de la FEB. Van aparte del resto porque son datos que no cambian: el
// fichero se amplía con los jugadores nuevos en lugar de regenerarse.
//
// La URL necesita el id del equipo del jugador en esa temporada (i) además de su
// licencia (c); con un equipo cualquiera la ficha carga pero viene vacía.
//
// Uso:
//   node scraper/datos-jugadores.js --competicion 3 --temporada 2025
//   node scraper/datos-jugadores.js                        (todas las que haya)
//   node scraper/datos-jugadores.js --forzar               (revisita los ya conocidos)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const CFG = require('./config');

const args = process.argv.slice(2);
const leerArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const FORZAR = args.includes('--forzar');
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const PAUSA = 800;
const DESTINO = path.join('data', 'jugadores-datos.json');

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
    catch (e) {
      ultimo = e;
      if (!transitorio(e) || i === REINTENTOS) break;
      await pausa(2000 * i);
    }
  }
  throw ultimo;
}

// "22/04/1983" -> "1983-04-22"
const fechaISO = f => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

function extraer(html) {
  const t = cheerio.load(html)('body').text().replace(/\s+/g, ' ');
  const alt = /Altura\s+(\d+)\s*cm/.exec(t);
  const nac = /Fecha Nacimiento\s+(\d{2}\/\d{2}\/\d{4})/.exec(t);
  const pai = /Nacionalidad\s+([A-ZÁÉÍÓÚÑ]+(?:\s[A-ZÁÉÍÓÚÑ]+)*?)\s+(?:Comparar|Seleccione)/.exec(t);
  // La FEB deja altura y puesto vacíos en la mayoría de fichas: se guardan si están.
  return {
    nacimiento: nac ? fechaISO(nac[1]) : null,
    nacionalidad: pai ? pai[1].trim() : null,
    altura: alt ? +alt[1] : null,
  };
}

function cargarExistentes() {
  if (!fs.existsSync(DESTINO)) return {};
  try {
    const j = JSON.parse(fs.readFileSync(DESTINO, 'utf8'));
    return j.jugadores || {};
  } catch { return {}; }
}

function guardar(datos) {
  fs.writeFileSync(DESTINO, JSON.stringify({
    actualizado: new Date().toISOString().slice(0, 10),
    fuente: 'Ficha de jugador en baloncestoenvivo.feb.es',
    nota: 'La FEB rellena la altura solo en algunas fichas. La fecha de nacimiento y la nacionalidad son fiables.',
    total: Object.keys(datos).length,
    jugadores: datos,
  }, null, 1));
}

(async () => {
  const datos = cargarExistentes();
  const yaTenia = Object.keys(datos).length;
  console.log(`Partimos de ${yaTenia} jugadores conocidos\n`);

  // Reunir jugador -> equipoId de todas las temporadas disponibles
  const pendientes = new Map();
  const fComp = leerArg('--competicion'), fTemp = leerArg('--temporada');
  for (const [id, comp] of Object.entries(COMPS)) {
    if (fComp && id !== String(fComp)) continue;
    const base = path.join('data', 'processed', comp);
    if (!fs.existsSync(base)) continue;
    for (const temp of fs.readdirSync(base)) {
      if (fTemp && temp !== fTemp) continue;
      const f = path.join(base, temp, 'jugadores.json');
      if (!fs.existsSync(f)) continue;
      for (const j of JSON.parse(fs.readFileSync(f, 'utf8'))) {
        const jid = String(j.idJugador);
        if (!jid || jid.startsWith('sin-id') || !j.equipoId) continue;
        if (!FORZAR && datos[jid]) continue;
        // La temporada más reciente da el equipoId más probable de funcionar
        pendientes.set(jid, { equipoId: j.equipoId, nombre: j.nombre });
      }
    }
  }

  console.log(`${pendientes.size} jugadores por consultar` +
              (pendientes.size ? ` (~${Math.round(pendientes.size * PAUSA / 60000)} min)\n` : '\n'));
  if (!pendientes.size) return;

  let n = 0, con = 0, sin = 0, errores = 0;
  for (const [jid, info] of pendientes) {
    n++;
    try {
      const r = await pedir(`${CFG.BASE}/Jugador.aspx?i=${info.equipoId}&c=${jid}`);
      const d = extraer(r.data);
      if (d.nacimiento) {
        datos[jid] = { nombre: info.nombre, ...d };
        con++;
      } else {
        sin++;
      }
    } catch (e) {
      errores++;
      if (errores <= 5) console.log(`  ! ${info.nombre}: ${e.response ? e.response.status : e.message}`);
    }
    if (n % 50 === 0) {
      guardar(datos);   // guardado periódico: un corte de red no tira el trabajo
      console.log(`  ${n}/${pendientes.size} · con datos ${con} · sin datos ${sin} · errores ${errores}`);
    }
    await pausa(PAUSA);
  }

  guardar(datos);
  console.log(`\nTerminado: ${con} nuevos con datos, ${sin} sin datos, ${errores} errores`);
  console.log(`${DESTINO}: ${Object.keys(datos).length} jugadores en total`);
})().catch(e => { console.error('Error general:', e.message); process.exit(1); });
