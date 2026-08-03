// Estadística de jugadores en las fases finales (ascenso, permanencia, playoff).
// Se genera aparte de calcular.js a propósito: las medias de liga regular no deben
// mezclarse con las fases, donde las muestras son de uno a seis partidos.
// Uso:
//   node scraper/calcular-fases-jugadores.js                        (todas)
//   node scraper/calcular-fases-jugadores.js --competicion 2 --temporada 2024
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const leerArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };

const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;

// Clasifica cada fase para poder mostrarla con su nombre en la ficha
function tipoDeFase(nombre) {
  const n = nombre.toUpperCase();
  if (n.includes('PERMANENCIA') || n.includes('DESCENSO')) return 'permanencia';
  return 'ascenso';
}

function procesar(comp, temporada) {
  const dir = path.join('data', 'processed', comp, temporada);
  const fFases = path.join(dir, 'fases.json');
  if (!fs.existsSync(fFases)) return null;

  const fases = JSON.parse(fs.readFileSync(fFases, 'utf8'));
  const porJugador = {};

  for (const fase of fases) {
    const tipo = tipoDeFase(fase.fase);
    for (const p of (fase.partidos || [])) {
      if (!p.boxscore) continue;
      for (const lado of ['local', 'visitante']) {
        for (const j of (p.boxscore[lado] || [])) {
          const id = String(j.idJugador || '');
          if (!id || id === 'undefined') continue;
          const a = porJugador[id] || (porJugador[id] = {
            idJugador: id, nombre: j.nombre, pj: 0, seg: 0,
            pt: 0, ro: 0, rd: 0, rt: 0, as: 0, br: 0, bp: 0,
            tf: 0, tco: 0, fc: 0, fr: 0, va: 0, pm: 0,
            t2a: 0, t2i: 0, t3a: 0, t3i: 0, tla: 0, tli: 0,
            fases: new Set(), tipos: new Set(),
          });
          a.pj++; a.seg += j.seg || 0;
          for (const k of ['pt','ro','rd','rt','as','br','bp','tf','tco','fc','fr','va','pm'])
            a[k] += j[k] || 0;
          a.t2a += j.t2?.a || 0; a.t2i += j.t2?.i || 0;
          a.t3a += j.t3?.a || 0; a.t3i += j.t3?.i || 0;
          a.tla += j.tl?.a || 0; a.tli += j.tl?.i || 0;
          a.fases.add(fase.fase);
          a.tipos.add(tipo);
        }
      }
    }
  }

  const salida = Object.values(porJugador).map(a => {
    const pj = a.pj;
    const pp = k => r1(a[k] / pj);
    const tci = a.t2i + a.t3i, tca = a.t2a + a.t3a;
    return {
      idJugador: a.idJugador,
      nombre: a.nombre,
      pj,
      minPorPartido: r1(a.seg / 60 / pj),
      ptPorPartido: pp('pt'),
      roPorPartido: pp('ro'),
      rdPorPartido: pp('rd'),
      rtPorPartido: pp('rt'),
      asPorPartido: pp('as'),
      brPorPartido: pp('br'),
      bpPorPartido: pp('bp'),
      tpPorPartido: pp('tf'),
      tcoPorPartido: pp('tco'),
      fcPorPartido: pp('fc'),
      frPorPartido: pp('fr'),
      vaPorPartido: pp('va'),
      pm: a.pm,
      t2Pct: a.t2i > 0 ? r2(100 * a.t2a / a.t2i) : 0,
      t3Pct: a.t3i > 0 ? r2(100 * a.t3a / a.t3i) : 0,
      tlPct: a.tli > 0 ? r2(100 * a.tla / a.tli) : 0,
      ts: (tci + 0.44 * a.tli) > 0 ? r2(100 * a.pt / (2 * (tci + 0.44 * a.tli))) : 0,
      efg: tci > 0 ? r2(100 * (tca + 0.5 * a.t3a) / tci) : 0,
      fases: [...a.fases],
      tipos: [...a.tipos],
    };
  }).sort((x, y) => y.pj - x.pj || y.ptPorPartido - x.ptPorPartido);

  const destino = path.join(dir, 'fases-jugadores.json');
  fs.writeFileSync(destino, JSON.stringify(salida, null, 1));

  const reparto = {};
  salida.forEach(j => { reparto[j.pj] = (reparto[j.pj] || 0) + 1; });
  console.log(`${comp} ${temporada}: ${salida.length} jugadores · reparto por partidos ` +
              JSON.stringify(reparto));
  return salida.length;
}

const fComp = leerArg('--competicion');
const fTemp = leerArg('--temporada');
let total = 0;
for (const [id, comp] of Object.entries(COMPS)) {
  if (fComp && id !== String(fComp)) continue;
  const base = path.join('data', 'processed', comp);
  if (!fs.existsSync(base)) continue;
  for (const temp of fs.readdirSync(base)) {
    if (fTemp && temp !== fTemp) continue;
    if (!/^\d{4}$/.test(temp)) continue;
    const n = procesar(comp, temp);
    if (n) total += n;
  }
}
console.log(`\n${total} registros de jugador en fases`);
