// Genera el índice histórico cruzando todas las temporadas ya calculadas.
// Lee data/processed/<temp>/jugadores.json y agrega por licencia (idJugador).
// Salida: data/processed/historico.json
// Uso: node scraper/historico.js
const fs = require('fs');
const path = require('path');

const BASE = path.join('data', 'processed');
const r2 = x => Math.round(x * 100) / 100;

const temporadas = fs.readdirSync(BASE)
  .filter(d => /^\d{4}$/.test(d) &&
    fs.existsSync(path.join(BASE, d, 'jugadores.json')))
  .sort();

console.log(`Temporadas encontradas: ${temporadas.join(', ')}`);

const hist = {};

for (const temp of temporadas) {
  const jugadores = JSON.parse(
    fs.readFileSync(path.join(BASE, temp, 'jugadores.json'), 'utf8'));

  const porLic = {};
  for (const j of jugadores) {
    const id = j.idJugador;
    if (!porLic[id]) porLic[id] = { nombre: j.nombre, etapas: [] };
    porLic[id].etapas.push(j);
  }

  for (const [id, data] of Object.entries(porLic)) {
    const et = data.etapas;
    const tot = k => et.reduce((a, e) => a + (e[k] || 0), 0);
    const pj = tot('pj');
    const min = tot('minTotales');
    const pt = tot('pt'), ro = tot('ro'), rd = tot('rd'), rt = tot('rt');
    const as = tot('as'), br = tot('br'), bp = tot('bp'), va = tot('va');
    const tf = tot('tfTot'), tco = tot('tcoTot'), fc = tot('fcTot'), fr = tot('frTot');
    const t2a = tot('t2a'), t2i = tot('t2i'), t3a = tot('t3a'), t3i = tot('t3i');
    const tla = tot('tla'), tli = tot('tli');
    const tciC = t2i + t3i, tcaC = t2a + t3a;
    const pp = v => pj ? r2(v / pj) : 0;

    if (!hist[id]) hist[id] = { idJugador: id, nombre: data.nombre, temporadas: {} };
    hist[id].nombre = data.nombre;
    hist[id].temporadas[temp] = {
      equipos: et.map(e => `${e.equipo} (${e.grupo})`),
      grupos: [...new Set(et.map(e => e.grupo))],
      pj,
      minPorPartido: pp(min),
      ptPorPartido: pp(pt),
      roPorPartido: pp(ro),
      rdPorPartido: pp(rd),
      rtPorPartido: pp(rt),
      asPorPartido: pp(as),
      brPorPartido: pp(br),
      bpPorPartido: pp(bp),
      tpPorPartido: pp(tf),
      tcoPorPartido: pp(tco),
      fcPorPartido: pp(fc),
      frPorPartido: pp(fr),
      vaPorPartido: pp(va),
      t2Pct: t2i ? r2(100 * t2a / t2i) : 0,
      t3Pct: t3i ? r2(100 * t3a / t3i) : 0,
      tlPct: tli ? r2(100 * tla / tli) : 0,
      ts: (tciC + 0.44 * tli) ? r2(100 * pt / (2 * (tciC + 0.44 * tli))) : 0,
      efg: tciC ? r2(100 * (tcaC + 0.5 * t3a) / tciC) : 0
    };
  }
}

const salida = Object.values(hist).map(h => ({
  ...h,
  nTemporadas: Object.keys(h.temporadas).length
}));

fs.writeFileSync(path.join(BASE, 'historico.json'), JSON.stringify(salida, null, 1));

const multi = salida.filter(h => h.nTemporadas > 1);
console.log(`Licencias totales: ${salida.length} | En más de una temporada: ${multi.length}`);
