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
const fs = require('fs');
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

// Extrae los 4 cortes acumulados (c=1..4) y calcula el rendimiento POR CUARTO
// de cada jugador restando cortes consecutivos. El parametro c de la URL controla
// el corte: c=1 -> hasta Q1, c=2 -> hasta Q2, ... c=4 -> partido completo.
async function extraerActaPorCuartos(partido, nCuartos = 4) {
  const cortes = [];
  for (let c = 1; c <= nCuartos; c++) {
    const url = `${CFG.BASE}/BoxScore.aspx?p=${partido}&c=${c}&qd=4&t=FINAL`;
    const r = await axios.get(url, { headers: CFG.HEADERS, timeout: 20000, responseType: "arraybuffer" });
    const parser = new PDFParse({ data: Buffer.from(r.data) });
    const res = await parser.getText();
    await parser.destroy();
    cortes.push(parseTexto(res.text || ""));
    await new Promise(r => setTimeout(r, CFG.PAUSA_MS || 1200));
  }

  // Campos numericos acumulables a diferenciar por cuarto
  const difJug = (act, prev) => {
    if (!prev) return { ...act };
    const d = { dorsal: act.dorsal, nombre: act.nombre, titular: act.titular };
    const resta = (a, b) => (a || 0) - (b || 0);
    d.pts = resta(act.pts, prev.pts);
    d.t2 = { a: resta(act.t2.a, prev.t2.a), i: resta(act.t2.i, prev.t2.i) };
    d.t3 = { a: resta(act.t3.a, prev.t3.a), i: resta(act.t3.i, prev.t3.i) };
    d.tl = { a: resta(act.tl.a, prev.tl.a), i: resta(act.tl.i, prev.tl.i) };
    d.rt = resta(act.rt, prev.rt); d.ro = resta(act.ro, prev.ro); d.rd = resta(act.rd, prev.rd);
    d.as = resta(act.as, prev.as); d.rec = resta(act.rec, prev.rec); d.per = resta(act.per, prev.per);
    d.val = resta(act.val, prev.val);
    return d;
  };

  // Por cada equipo y jugador (cruzado por dorsal), rendimiento de cada cuarto
  const porCuarto = cortes.map((corte, ci) => {
    const prev = ci > 0 ? cortes[ci - 1] : null;
    return corte.equipos.map((eq, ei) => ({
      jugadores: eq.jugadores.map(j => {
        const jp = prev ? prev.equipos[ei].jugadores.find(x => x.dorsal === j.dorsal) : null;
        return difJug(j, jp);
      })
    }));
  });

  return {
    final: cortes[nCuartos - 1],   // acta completa (= extraerActa)
    cortes,                         // los 4 acumulados
    porCuarto,                      // rendimiento de cada cuarto por jugador
  };
}

module.exports = { extraerActa, extraerActaPorCuartos, parseTexto, parseJugador };

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const partido = val('--partido');
  const comp = val('--competicion') || '1';
  if (!partido) { console.error('Falta --partido. Ej: node scraper/extraer-acta.js --partido 2484702 --competicion 1'); process.exit(1); }
  extraerActa(partido, comp).then(a => {
    const path = require('path');
    const dir = path.join('data', 'actas');
    fs.mkdirSync(dir, { recursive: true });
    const salida = {
      partido, competicion: comp,
      marcador: a.marcador,
      local: a.nombreLocal, visitante: a.nombreVisitante,
      parciales: a.parciales,
      contexto: a.contexto,
      equipos: a.equipos.map((e, i) => ({
        lado: i === 0 ? 'local' : 'visitante',
        nombre: i === 0 ? a.nombreLocal : a.nombreVisitante,
        jugadores: e.jugadores,
      })),
      generado: new Date().toISOString().slice(0, 10),
    };
    fs.writeFileSync(path.join(dir, partido + '.json'), JSON.stringify(salida, null, 1));
    console.log('guardado data/actas/' + partido + '.json');
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
