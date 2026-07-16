// Cálculo de estadísticas avanzadas desde data/raw -> data/processed
// Uso: node scraper/calcular.js [--temporada 2025]
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const iT = args.indexOf('--temporada');
const TEMPORADA = iT >= 0 ? args[iT + 1] : '2025';

const DIR_RAW = path.join('data', 'raw', TEMPORADA);
const DIR_OUT = path.join('data', 'processed', TEMPORADA);
fs.mkdirSync(DIR_OUT, { recursive: true });

// ---------- carga ----------
const partidos = [];
const excluidos = [];
for (const grupo of fs.readdirSync(DIR_RAW)) {
  const dirGrupo = path.join(DIR_RAW, grupo);
  if (!fs.statSync(dirGrupo).isDirectory()) continue;
  for (const f of fs.readdirSync(dirGrupo)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const p = JSON.parse(fs.readFileSync(path.join(dirGrupo, f), 'utf8'));
    const disputado = p.boxscore &&
      p.boxscore.local.length > 0 && p.boxscore.visitante.length > 0;
    if (!disputado) {
      excluidos.push({ id: p.id, grupo: p.grupo, jornada: p.jornada,
        partido: `${p.equipoLocal.nombre} vs ${p.equipoVisitante.nombre}`,
        resultado: p.resultado });
      continue;
    }
    partidos.push(p);
  }
}
console.log(`Partidos cargados: ${partidos.length} | Excluidos (no disputados): ${excluidos.length}`);

// ---------- utilidades ----------
const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);

function totalesEquipo(box) {
  return {
    pt: sum(box, j => j.pt),
    t2a: sum(box, j => j.t2.a), t2i: sum(box, j => j.t2.i),
    t3a: sum(box, j => j.t3.a), t3i: sum(box, j => j.t3.i),
    tla: sum(box, j => j.tl.a), tli: sum(box, j => j.tl.i),
    ro: sum(box, j => j.ro), rd: sum(box, j => j.rd),
    as: sum(box, j => j.as), br: sum(box, j => j.br), bp: sum(box, j => j.bp),
    fc: sum(box, j => j.fc), seg: sum(box, j => j.seg)
  };
}
const tci = t => t.t2i + t.t3i;
const tca = t => t.t2a + t.t3a;
const posesiones = t => tci(t) - t.ro + t.bp + 0.44 * t.tli;
const r2 = x => Math.round(x * 100) / 100;

// ---------- agregación por equipo y jugador ----------
const equipos = {};   // clave: idEquipo
const jugadores = {}; // clave: idEquipo|nombre (la FEB no expone id de jugador en el boxscore)

function initEquipo(id, nombre, grupo) {
  if (!equipos[id]) equipos[id] = { id, nombre, grupo, pj: 0, pg: 0,
    pf: 0, pc: 0, pos: 0, posRival: 0,
    t: { t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0,ro:0,rd:0,as:0,br:0,bp:0,fc:0,seg:0 },
    rival: { ro:0, rd:0, pt:0 },
    casa: { pj:0, pg:0 }, fuera: { pj:0, pg:0 } };
  return equipos[id];
}

function acumular(eq, t, tRival, esLocal, gano) {
  eq.pj++; if (gano) eq.pg++;
  eq.pf += t.pt; eq.pc += tRival.pt;
  eq.pos += posesiones(t); eq.posRival += posesiones(tRival);
  for (const k of Object.keys(eq.t)) eq.t[k] += t[k];
  eq.rival.ro += tRival.ro; eq.rival.rd += tRival.rd; eq.rival.pt += tRival.pt;
  const split = esLocal ? eq.casa : eq.fuera;
  split.pj++; if (gano) split.pg++;
}

function acumularJugador(j, equipoId, equipoNombre, grupo, jornada, idPartido) {
  const clave = `${equipoId}|${j.nombre}`;
  if (!jugadores[clave]) jugadores[clave] = { nombre: j.nombre, dorsal: j.dorsal,
    equipoId, equipo: equipoNombre, grupo, pj: 0, titular: 0, seg: 0,
    pt:0, t2a:0,t2i:0,t3a:0,t3i:0,tla:0,tli:0, ro:0,rd:0,rt:0,as:0,br:0,bp:0,
    tf:0,fc:0,fr:0,va:0,pm:0, partidos: [] };
  const J = jugadores[clave];
  J.pj++; if (j.titular) J.titular++;
  J.seg += j.seg; J.pt += j.pt;
  J.t2a += j.t2.a; J.t2i += j.t2.i; J.t3a += j.t3.a; J.t3i += j.t3.i;
  J.tla += j.tl.a; J.tli += j.tl.i;
  J.ro += j.ro; J.rd += j.rd; J.rt += j.rt; J.as += j.as; J.br += j.br; J.bp += j.bp;
  J.tf += j.tf; J.fc += j.fc; J.fr += j.fr; J.va += j.va; J.pm += j.pm;
  J.partidos.push({ id: idPartido, jornada, pt: j.pt, va: j.va, seg: j.seg });
}

for (const p of partidos) {
  const tL = totalesEquipo(p.boxscore.local);
  const tV = totalesEquipo(p.boxscore.visitante);
  const [gL, gV] = p.resultado.split('-').map(Number);
  const eqL = initEquipo(p.equipoLocal.id, p.equipoLocal.nombre, p.grupo);
  const eqV = initEquipo(p.equipoVisitante.id, p.equipoVisitante.nombre, p.grupo);
  acumular(eqL, tL, tV, true, gL > gV);
  acumular(eqV, tV, tL, false, gV > gL);
  p.boxscore.local.forEach(j => acumularJugador(j, p.equipoLocal.id, p.equipoLocal.nombre, p.grupo, p.jornada, p.id));
  p.boxscore.visitante.forEach(j => acumularJugador(j, p.equipoVisitante.id, p.equipoVisitante.nombre, p.grupo, p.jornada, p.id));
}

// ---------- métricas avanzadas de equipo ----------
const salidaEquipos = Object.values(equipos).map(e => {
  const t = e.t;
  const posMedia = e.pos / e.pj;
  return {
    id: e.id, nombre: e.nombre, grupo: e.grupo,
    pj: e.pj, pg: e.pg, pp: e.pj - e.pg,
    pf: e.pf, pc: e.pc,
    casa: e.casa, fuera: e.fuera,
    pace: r2(posMedia),                       // posesiones por partido
    ortg: r2(100 * e.pf / e.pos),             // pts por 100 posesiones
    drtg: r2(100 * e.pc / e.posRival),
    netrtg: r2(100 * e.pf / e.pos - 100 * e.pc / e.posRival),
    efg: r2(100 * (tca(t) + 0.5 * t.t3a) / tci(t)),
    tovPct: r2(100 * t.bp / e.pos),
    orbPct: r2(100 * t.ro / (t.ro + e.rival.rd)),
    ftRate: r2(100 * t.tla / tci(t)),
    t3Pct: r2(100 * t.t3a / t.t3i),
    asPorBp: r2(t.as / t.bp)
  };
}).sort((a, b) => a.grupo.localeCompare(b.grupo) || b.netrtg - a.netrtg);

// ---------- métricas avanzadas de jugador ----------
const salidaJugadores = Object.values(jugadores).map(J => {
  const min = J.seg / 60;
  const tciJ = J.t2i + J.t3i;
  const tcaJ = J.t2a + J.t3a;
  const eq = equipos[J.equipoId];
  // USG%: posesiones usadas por el jugador respecto a las del equipo mientras está en pista
  const usg = min > 0 ? 100 * ((tciJ + 0.44 * J.tli + J.bp) * (eq.t.seg / 60 / 5)) /
    (min * (tci(eq.t) + 0.44 * eq.t.tli + eq.t.bp)) : 0;
  const per36 = v => min > 0 ? r2(v * 36 / min) : 0;
  return {
    nombre: J.nombre, dorsal: J.dorsal, equipo: J.equipo, equipoId: J.equipoId, grupo: J.grupo,
    pj: J.pj, titular: J.titular, minTotales: r2(min), minPorPartido: r2(min / J.pj),
    pt: J.pt, rt: J.rt, as: J.as, br: J.br, bp: J.bp, va: J.va, pm: J.pm,
    ptPorPartido: r2(J.pt / J.pj), vaPorPartido: r2(J.va / J.pj),
    ts: tciJ + 0.44 * J.tli > 0 ? r2(100 * J.pt / (2 * (tciJ + 0.44 * J.tli))) : 0,
    efg: tciJ > 0 ? r2(100 * (tcaJ + 0.5 * J.t3a) / tciJ) : 0,
    t2Pct: J.t2i > 0 ? r2(100 * J.t2a / J.t2i) : 0,
    t3Pct: J.t3i > 0 ? r2(100 * J.t3a / J.t3i) : 0,
    tlPct: J.tli > 0 ? r2(100 * J.tla / J.tli) : 0,
    usg: r2(usg),
    per36: { pt: per36(J.pt), rt: per36(J.rt), as: per36(J.as), br: per36(J.br), va: per36(J.va) },
    evolucion: J.partidos
  };
}).sort((a, b) => b.vaPorPartido - a.vaPorPartido);

// ---------- escritura ----------
fs.writeFileSync(path.join(DIR_OUT, 'equipos.json'), JSON.stringify(salidaEquipos, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'jugadores.json'), JSON.stringify(salidaJugadores, null, 1));
fs.writeFileSync(path.join(DIR_OUT, 'excluidos.json'), JSON.stringify(excluidos, null, 1));

console.log(`\nEquipos procesados: ${salidaEquipos.length}`);
console.log(`Jugadores procesados: ${salidaJugadores.length}`);
console.log(`\n=== Partidos excluidos (control de calidad) ===`);
excluidos.forEach(e => console.log(`  ${e.grupo} ${e.jornada}: ${e.partido} (${e.resultado})`));

// Muestra: top 5 equipos por NetRtg y top 5 jugadores por valoración
console.log('\n=== Top 5 equipos por Net Rating ===');
[...salidaEquipos].sort((a, b) => b.netrtg - a.netrtg).slice(0, 5)
  .forEach(e => console.log(`  ${e.grupo} | ${e.nombre}: ORtg ${e.ortg} / DRtg ${e.drtg} / Net ${e.netrtg} | Pace ${e.pace}`));
console.log('\n=== Top 5 jugadores por valoración/partido (min. 10 partidos) ===');
salidaJugadores.filter(j => j.pj >= 10).slice(0, 5)
  .forEach(j => console.log(`  ${j.grupo} | ${j.nombre} (${j.equipo}): ${j.vaPorPartido} VA | ${j.ptPorPartido} pts | TS ${j.ts}% | USG ${j.usg}%`));
