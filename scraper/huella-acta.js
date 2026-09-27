// Huella estructural de un acta oficial FEB: la FORMA del documento (cabeceras de
// la tabla de jugadores, tokens numericos por fila, etiquetas del bloque de
// contexto, secciones del documento y marcas de una sola letra), nunca los datos
// del partido. Sirve para comparar, de forma mecanica y determinista, si dos
// actas comparten estructura -- el uso real es fijar una linea base ANTES del 1
// de octubre de 2026 (cambio de reglamento FIBA) y compararla contra actas
// posteriores, para saber si extraer-acta.js sigue leyendo las columnas en la
// posicion que asume (lee la fila del jugador por posicion; un desplazamiento
// fino no rompe nada visiblemente, solo hace que val y +/- lean numeros
// equivocados).
//
// Baja el acta por la MISMA via que extraer-acta.js: misma URL, mismos
// parametros, mismo pdf-parse. Para tokensPorFila y marcasUnaLetra usa a
// proposito una deteccion de fila MAS ESTRICTA que la de extraer-acta.js hoy
// (patron /^\d+\s/ + ancla MM:SS en la MISMA linea, SIN unir lineas envueltas):
// asi la huella mide "cuantos tokens trae una fila que llega entera en una
// linea", que es justo la suposicion de la que depende parseJugador (n[0]..
// n[18]) y la que un cambio de reglamento pondria en riesgo. Union de nombres
// envueltos en dos lineas: ya NO es un punto ciego de extraer-acta.js (ver
// S17.6, arreglado a raiz de esto mismo -- partido 2535727, Angel Comendador,
// lineas "24  ANGEL COMENDADOR" / "I" / "12:20  9  3/6..."), pero esta huella
// sigue sin unirlas aposta: son fenomenos distintos (una fila envuelta es un
// problema de maquetacion del PDF, no de reglamento) y mezclarlos aqui
// esconderia un cambio de columnas detras de un caso de nombre largo.
//
// Uso: node scraper/huella-acta.js --partido 2535727 --competicion 1
const axios = require('axios');
const { PDFParse } = require('pdf-parse');
const CFG = require('./config');
const { parseTexto } = require('./extraer-acta');

async function bajarTexto(partido, competicion) {
  const url = `${CFG.BASE}/BoxScore.aspx?p=${partido}&c=${competicion}&qd=1&t=FINAL`;
  const r = await axios.get(url, { headers: CFG.HEADERS, timeout: 20000, responseType: 'arraybuffer' });
  const parser = new PDFParse({ data: Buffer.from(r.data) });
  const res = await parser.getText();
  await parser.destroy();
  return res.text || '';
}

const normalizar = l => l.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();

// Misma ancla que parseJugador en extraer-acta.js: dorsal, [*], nombre, MM:SS, resto.
const RE_FILA_JUGADOR = /^(\d+)\s+(\*\s+)?(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/;

function huellaDeTexto(texto) {
  const lineas = texto.split('\n').map(normalizar);
  const { nombreLocal, nombreVisitante } = parseTexto(texto);

  // --- 1. Cabecera de la tabla de jugadores, una por equipo, en el orden en que
  //        aparecen. Cada cabecera es el bloque completo entre la linea "Nº ..."
  //        y la primera fila de jugador (el PDF reparte los rotulos de columna en
  //        varias lineas de texto plano: TC2P/TC3P/TL/REB/... cada uno en la suya).
  const cabeceras = [];
  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].startsWith('Nº')) continue;
    const bloque = [];
    let k = i;
    while (k < lineas.length && !/^\d+\s/.test(lineas[k])) { bloque.push(lineas[k]); k++; }
    cabeceras.push(bloque.join(' | '));
  }

  // --- 2. Conjunto (no la media) de "tokens numericos" por fila de jugador tras
  //        el ancla MM:SS. Hoy el parser asume 19 (n[0]..n[18]); si aparecen filas
  //        con otro numero de tokens, tiene que verse aqui.
  const tokensPorFilaSet = new Set();
  for (const l of lineas) {
    const m = l.match(RE_FILA_JUGADOR);
    if (m) tokensPorFilaSet.add(m[5].split(' ').length);
  }

  // --- 3. Bloque de contexto (Maxima ventaja, Puntos 2ª oportunidad, ...). El PDF
  //        agrupa varias etiquetas seguidas y solo despues llegan equipo+numeros,
  //        asi que se registra por GRUPO de etiquetas consecutivas: la lista de
  //        etiquetas del grupo y, para cada aparicion de equipo dentro de el,
  //        cuantos numeros le siguen (normalmente [N, N], uno por equipo). Si
  //        cambia una etiqueta, cuantas trae el grupo, o cuantos numeros siguen a
  //        cada equipo, se ve en este campo.
  //
  //        Aqui dentro el nombre de equipo NO siempre es el completo: el PDF lo
  //        trunca sin la ciudad final ("PALMER BASKET MALLORCA" en vez de
  //        "PALMER BASKET MALLORCA PALMA", que es como aparece en la cabecera del
  //        boxscore). Por eso esEquipoLinea acepta tambien el prefijo.
  const esNumero = l => /^-?\d+$/.test(l);
  const esEquipoLinea = l => l && (
    l === nombreLocal || l === nombreVisitante ||
    (nombreLocal && nombreLocal.startsWith(l + ' ')) ||
    (nombreVisitante && nombreVisitante.startsWith(l + ' '))
  );
  let iEntrenador = -1;
  for (let i = 0; i < lineas.length; i++) if (/^Entrenador:/.test(lineas[i])) iEntrenador = i;
  // El bloque de contexto acaba donde empiezan los metadatos del partido
  // (competicion/recinto/fecha, "Partido No. ...", direccion...): la primera
  // linea con una fecha "DD/MM/AAAA" es una frontera estable, porque ninguna
  // etiqueta, equipo o numero del bloque de contexto trae nunca una barra.
  const iEstadisticas = lineas.findIndex(l => /ESTADISTICAS DEL PARTIDO/.test(l));
  let iFinContexto = lineas.findIndex((l, idx) => idx > iEntrenador && /\d{2}\/\d{2}\/\d{4}/.test(l));
  if (iFinContexto < 0) iFinContexto = iEstadisticas >= 0 ? iEstadisticas : lineas.length;
  const contexto = [];
  if (iEntrenador >= 0 && iFinContexto > iEntrenador) {
    let i = iEntrenador + 1;
    while (i < iFinContexto) {
      const l = lineas[i];
      if (l && !esNumero(l) && !esEquipoLinea(l)) {
        const etiquetas = [];
        while (i < iFinContexto && lineas[i] && !esNumero(lineas[i]) && !esEquipoLinea(lineas[i])) {
          etiquetas.push(lineas[i]);
          i++;
        }
        const conteos = [];
        while (i < iFinContexto && esEquipoLinea(lineas[i])) {
          i++; // consumir la linea de equipo
          let n = 0;
          while (i < iFinContexto && esNumero(lineas[i])) { n++; i++; }
          conteos.push(n);
        }
        contexto.push({ etiquetas, conteos });
      } else {
        i++;
      }
    }
  }

  // --- 4. Lista de encabezados/secciones del documento, en orden. Los nombres de
  //        equipo se genericen a "<EQUIPO>" y las lineas "Etiqueta: valor" (p.ej.
  //        "Entrenador: ...", "Arbitros: ...") se truncan a la etiqueta: lo que
  //        varia de un partido a otro es el dato, no la forma. Se descarta
  //        cualquier linea con algun token que sea puramente numerico (marcador,
  //        conteos de "Equipo/Entrenador", fechas sueltas...) o con 2+ digitos
  //        seguidos dentro de un token (fecha "25/09/2026", "Asistencia:1800",
  //        direccion con numero de calle) -- salvo el contador de paginas
  //        ("-- N of M --"), que si es estructural. Un solo digito pegado a
  //        letras (el "2" de "Puntos 2ª oportunidad", el "5" de "5I", el "1" de
  //        "P1") no cuenta como dato y no descarta la linea. Se descartan ademas
  //        fragmentos sueltos de una sola letra: son el resto de un nombre de
  //        jugador partido en dos lineas por el PDF (ver la nota de cabecera de
  //        este fichero), no una seccion real. Y se salta entero el bloque de
  //        metadatos del partido (competicion/recinto/fecha, "Partido No. ...",
  //        direccion, asistencia): es dato de principio a fin -- una direccion
  //        sin numero de calle ("S/N") no tiene digitos y coló una vez por la
  //        regla anterior (visto en el partido 2535728, Córdoba), así que ya no
  //        basta con detectar digitos, hay que acotar el rango. El nombre de
  //        equipo se comprueba ANTES del filtro de digitos: hay equipos con un
  //        numero en el nombre oficial (visto en el partido 2535730, "INSOLAC
  //        CAJA 87"), y ese numero no lo convierte en una fila de datos.
  const RE_PAGINA = /^--\s*\d+\s+of\s+\d+\s*--$/;
  const secciones = [];
  for (let i = 0; i < lineas.length; i++) {
    if (i >= iFinContexto && i < iEstadisticas) continue;
    const l = lineas[i];
    if (!l) continue;
    if (RE_PAGINA.test(l)) { secciones.push(l); continue; }
    if (esEquipoLinea(l)) { secciones.push('<EQUIPO>'); continue; }
    const tieneTokenNumerico = l.split(' ').some(t => /^-?\d+$/.test(t));
    if (tieneTokenNumerico || /\d{2,}/.test(l)) continue;
    if (l.length <= 1) continue;
    const iDosPuntos = l.indexOf(':');
    secciones.push(iDosPuntos >= 0 ? l.slice(0, iDosPuntos + 1) : l);
  }

  // --- 5. Conjunto de marcas de una sola letra junto a un jugador (el * de
  //        titular, y cualquier otra) -- aqui asomarian DI y FL en octubre. Se
  //        mira SOLO el hueco del marcador entre dorsal y nombre (grupo 2 de
  //        RE_FILA_JUGADOR, donde vive el "*") y la zona de faltas -- los tokens
  //        posteriores al ancla MM:SS (grupo 5) -- nunca el nombre (grupo 3): un
  //        nombre puede traer una letra suelta de verdad (visto en el partido
  //        2535729, "SERIGNE M M SY DIT DIAMIL") y no es una marca de partido.
  const marcasUnaLetra = new Set();
  for (const l of lineas) {
    const m = l.match(RE_FILA_JUGADOR);
    if (!m) continue;
    const marcador = (m[2] || '').trim();
    if (/^[A-Za-zÀ-ÿ*]$/.test(marcador)) marcasUnaLetra.add(marcador);
    for (const tok of m[5].split(' ')) {
      if (/^[A-Za-zÀ-ÿ*]$/.test(tok)) marcasUnaLetra.add(tok);
    }
  }

  return {
    cabeceras,
    tokensPorFila: [...tokensPorFilaSet].sort((a, b) => a - b),
    contexto,
    secciones,
    marcasUnaLetra: [...marcasUnaLetra].sort(),
  };
}

async function huellaDePartido(partido, competicion) {
  const texto = await bajarTexto(partido, competicion);
  return huellaDeTexto(texto);
}

// Reordena las claves de un objeto (recursivo) para que JSON.stringify produzca
// siempre el mismo texto y un `diff` entre dos huellas sea legible.
function ordenarClaves(x) {
  if (Array.isArray(x)) return x.map(ordenarClaves);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = ordenarClaves(x[k]);
    return out;
  }
  return x;
}

module.exports = { huellaDeTexto, huellaDePartido, ordenarClaves };

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const partido = val('--partido');
  const comp = val('--competicion') || '1';
  if (!partido) { console.error('Falta --partido. Ej: node scraper/huella-acta.js --partido 2535727 --competicion 1'); process.exit(1); }
  huellaDePartido(partido, comp).then(h => {
    console.log(JSON.stringify(ordenarClaves(h), null, 1));
  }).catch(e => { console.error('Error:', e.message); process.exit(1); });
}
