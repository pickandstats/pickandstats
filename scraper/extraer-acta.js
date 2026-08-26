// Extrae de la acta oficial en PDF (pública) de un partido FEB:
//   - boxscore final por jugador (con titular)
//   - parciales de marcador por cuarto
//   - datos de contexto (pintura, contraataque, banquillo, máxima ventaja...)
//
// Fuente: https://baloncestoenvivo.feb.es/BoxScore.aspx?p=<id>&c=<comp>&qd=1&t=FINAL
// (documento público, sin autenticación). qd=1&t=FINAL devuelve el partido completo.
//
// Uso como módulo:  const { extraerActa } = require('./extraer-acta');
// Uso directo:      node scraper/extraer-acta.js --partido 2484702 --competicion 1
const axios = require('axios');
const { PDFParse } = require('pdf-parse');
const CFG = require('./config');

// Parsea una fila de jugador. Ancla: MM:SS separa (nº [*] nombre) de los números.
function parseJugador(linea) {
  const l = linea.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  const m = l.match(/^(\d+)\s+(\*\s+)?(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);
  if (!m) return null;
  const [, dorsal, titular, nombre, min, resto] = m;
  const n = resto.split(' ');
  // PTS T2(a/i) % T3(a/i) % TL(a/i) % O D T AS REC PER TAPc TAPr FPc FPr VAL +/-
  const ai = s => { const [a, i] = (s || '0/0').split('/').map(Number); return { a: a || 0, i: i || 0 }; };
  return {
    dorsal, titular: !!titular, nombre: nombre.trim(), min,
    pts: +n[0],
    t2: ai(n[1]), t3: ai(n[3]), tl: ai(n[5]),
    ro: +n[7], rd: +n[8], rt: +n[9],
    as: +n[10], rec: +n[11], per: +n[12],
    tap: +n[13], tapRec: +n[14],
    fc: +n[15], fr: +n[16],
    val: +n[17], mas: +n[18],
  };
}

function parseTexto(texto) {
  const lineas = texto.split('\n');

  // --- jugadores: filas que empiezan por número, hasta cada "Totales" ---
  const equipos = [];
  let actual = null;
  for (const raw of lineas) {
    const l = raw.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^Totales\s/.test(l)) { if (actual) { equipos.push(actual); actual = null; } continue; }
    if (/^\d+\s/.test(l)) {
      const j = parseJugador(raw);
      if (j) { (actual ||= { jugadores: [] }).jugadores.push(j); }
    }
  }

  // --- parciales de marcador: (13-24,9-26,...) ---
  const parMatch = texto.match(/\((\d+-\d+(?:,\d+-\d+)*)\)/);
  const parciales = parMatch ? parMatch[1].split(',').map(p => {
    const [l, v] = p.split('-').map(Number); return { local: l, visitante: v };
  }) : [];

  // --- marcador y equipos: la línea tras "ESTADISTICAS DEL PARTIDO" ---
  //     "BC PEÑÍSCOLA 69 - 89 FUNDACIÓ CAIXA RURAL VILA-REAL"
  const idxMarc = lineas.findIndex(l => /ESTADISTICAS DEL PARTIDO/.test(l));
  let marcador = null, nombreLocal = null, nombreVisitante = null;
  if (idxMarc >= 0) {
    const lm = (lineas[idxMarc + 1] || "").trim();
    const m = lm.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
    if (m) {
      nombreLocal = m[1].trim();
      nombreVisitante = m[4].trim();
      marcador = { local: +m[2], visitante: +m[3] };
    }
  }

  // --- contexto ---
  // Grupo 1 (desde "Máxima ventaja"): tras cada equipo hay 2 valores
  //   [maxVentaja, mejorRacha]. Cambios de ventaja / Veces empatado no traen
  //   número desglosado en el texto plano, se omiten.
  // Grupo 2 (desde "Puntos 2ª oportunidad"): 5 valores por equipo
  //   [segundaOportunidad, contraataque, pintura, trasPerdida, banquillo].
  const L = lineas.map(x => x.trim());
  const numsTras = (etiqueta, saltarHastaEquipo, cuantos) => {
    let i = L.findIndex(x => x.startsWith(etiqueta));
    if (i < 0) return null;
    // avanza hasta la primera línea que sea un nombre de equipo (no-número, no-etiqueta)
    // y recoge los siguientes `cuantos` números
    const recoger = desde => {
      const out = [];
      for (let k = desde; k < L.length && out.length < cuantos; k++) {
        if (/^-?\d+$/.test(L[k])) out.push(+L[k]);
      }
      return out;
    };
    // Encuentra las dos apariciones de equipo tras la etiqueta
    const eqIdx = [];
    for (let k = i; k < L.length && eqIdx.length < 2; k++) {
      if (!/^-?\d+$/.test(L[k]) && !/^(Máxima|Mejor|Cambios|Veces|Puntos)/.test(L[k]) && L[k].length > 3 && k > i) {
        eqIdx.push(k);
      }
    }
    if (eqIdx.length < 2) return null;
    return { local: recoger(eqIdx[0] + 1), visitante: recoger(eqIdx[1] + 1) };
  };

  const g1 = numsTras("Máxima ventaja", true, 2);
  const g2 = numsTras("Puntos 2ª oportunidad", true, 5);
  const contexto = {
    maximaVentaja: g1 ? { local: g1.local[0], visitante: g1.visitante[0] } : null,
    mejorRacha:    g1 ? { local: g1.local[1], visitante: g1.visitante[1] } : null,
    segundaOportunidad: g2 ? { local: g2.local[0], visitante: g2.visitante[0] } : null,
    contraataque:  g2 ? { local: g2.local[1], visitante: g2.visitante[1] } : null,
    pintura:       g2 ? { local: g2.local[2], visitante: g2.visitante[2] } : null,
    trasPerdida:   g2 ? { local: g2.local[3], visitante: g2.visitante[3] } : null,
    banquillo:     g2 ? { local: g2.local[4], visitante: g2.visitante[4] } : null,
  };

  return { marcador, nombreLocal, nombreVisitante, parciales, contexto, equipos };
}

async function extraerActa(partido, competicion = 1) {
  const url = `${CFG.BASE}/BoxScore.aspx?p=${partido}&c=${competicion}&qd=1&t=FINAL`;
  const r = await axios.get(url, { headers: CFG.HEADERS, timeout: 20000, responseType: 'arraybuffer' });
  const parser = new PDFParse({ data: Buffer.from(r.data) });
  const res = await parser.getText();
  await parser.destroy();
  return parseTexto(res.text || '');
}

module.exports = { extraerActa, parseTexto, parseJugador };

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const partido = val('--partido');
  const comp = val('--competicion') || '1';
  if (!partido) { console.error('Falta --partido. Ej: node scraper/extraer-acta.js --partido 2484702 --competicion 1'); process.exit(1); }
  extraerActa(partido, comp).then(a => {
    console.log('marcador:', JSON.stringify(a.marcador));
    console.log('parciales:', a.parciales.map(p => `${p.local}-${p.visitante}`).join(', '));
    console.log("\ncontexto:", JSON.stringify(a.contexto, null, 1));
    a.equipos.forEach((e, i) => {
      console.log(`\nequipo ${i + 1}: ${e.jugadores.length} jugadores`);
      e.jugadores.slice(0, 3).forEach(j =>
        console.log(`  ${j.titular ? '*' : ' '} ${j.dorsal.padStart(2)} ${j.nombre.padEnd(26)} ${j.min} pts:${j.pts} t2:${j.t2.a}/${j.t2.i} reb:${j.rt} val:${j.val}`));
    });
  }).catch(e => { console.error('Error:', e.message); process.exit(1); });
}
