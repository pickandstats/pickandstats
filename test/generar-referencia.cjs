// Congela valores conocidos-buenos de las temporadas cerradas, para que
// test/regresion.cjs avise si un cambio futuro en calcular.js los altera.
//   node test/generar-referencia.cjs                    (todas)
//   node test/generar-referencia.cjs segundafeb 2024    (una concreta)
const p = require('path'), fs = require('fs');

const COMPS = ['primerafeb', 'segundafeb', 'tercerafeb'];
const TEMPS = ['2023', '2024', '2025'];
const filtroComp = process.argv[2], filtroTemp = process.argv[3];

// Métricas avanzadas de equipo: son las que un cambio de fórmula rompería en silencio
const AVANZADAS_EQ = ['pace','ortg','drtg','netrtg','srs','efg','tovPct','orbPct','ftRate',
                      'efgRival','tovForzadas','drbPct','ftrRival','ts','victoriasEsperadas'];
const AVANZADAS_JUG = ['ts','efg','usg','per36','t2Pct','t3Pct','tlPct'];

function foto(comp, temp) {
  const dir = p.join(process.cwd(), 'data', 'processed', comp, temp);
  if (!fs.existsSync(p.join(dir, 'jugadores.json'))) return null;
  const cargar = f => { const j = require(p.join(dir, f)); return Array.isArray(j) ? j : Object.values(j); };
  const jug = cargar('jugadores.json'), eq = cargar('equipos.json');
  const reales = jug.filter(x => x.idJugador && !String(x.idJugador).startsWith('sin-id'));
  const top = reales.slice().sort((a, b) => b.minTotales - a.minTotales).slice(0, 5);
  const eqTop = eq.slice().sort((a, b) => (b.pf || 0) - (a.pf || 0)).slice(0, 3);

  const soloDe = (obj, claves) => Object.fromEntries(
    claves.filter(k => obj[k] !== undefined && obj[k] !== null).map(k => [k, obj[k]]));

  return {
    competicion: comp, temporada: temp,
    totales: {
      nJugadores: jug.length, nEquipos: eq.length,
      sumaPuntosLiga: eq.reduce((a, e) => a + (e.pf || 0), 0)
    },
    jugadores: top.map(j => ({
      idJugador: String(j.idJugador), nombre: j.nombre,
      exactos: { pj: j.pj, pt: j.pt, minTotales: j.minTotales, t2a: j.t2a, t3a: j.t3a, tla: j.tla },
      aprox: soloDe(j, AVANZADAS_JUG.concat(['per36']))
    })),
    equipos: eqTop.map(e => ({
      nombre: e.nombre,
      exactos: { pj: e.pj, pf: e.pf, pc: e.pc },
      aprox: soloDe(e, AVANZADAS_EQ)
    }))
  };
}

const ref = {
  _generado: new Date().toISOString().slice(0, 10),
  _nota: 'Valores buenos por temporada, incluidas metricas avanzadas. Si regresion.cjs falla, un cambio ha alterado el calculo.',
  temporadas: []
};
for (const c of COMPS) for (const t of TEMPS) {
  if (filtroComp && c !== filtroComp) continue;
  if (filtroTemp && t !== filtroTemp) continue;
  const f = foto(c, t);
  if (f) {
    ref.temporadas.push(f);
    const nAv = Object.keys(f.equipos[0].aprox).length;
    console.log('  ' + c + ' ' + t + ': ' + f.totales.nJugadores + ' jug · ' +
                f.totales.nEquipos + ' eq · ' + nAv + ' metricas avanzadas por equipo');
  } else console.log('  ' + c + ' ' + t + ': (sin datos, omitida)');
}

fs.writeFileSync(p.join('test', 'referencia.json'), JSON.stringify(ref, null, 2));
console.log('\n' + ref.temporadas.length + ' temporada(s) congeladas en test/referencia.json');
