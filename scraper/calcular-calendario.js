// Genera el calendario de una temporada a partir de los índices que deja el scraper.
// A diferencia de los partidos jugados, aquí interesan los que aún no se han disputado:
// el índice guarda equipos, fecha y hora aunque no haya acta que descargar.
// Uso:
//   node scraper/calcular-calendario.js --temporada 2026
//   node scraper/calcular-calendario.js --temporada 2026 --competicion 3
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const leerArg = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };

const TEMPORADA = leerArg('--temporada');
if (!TEMPORADA) {
  console.error('Falta --temporada. Ej: node scraper/calcular-calendario.js --temporada 2026');
  process.exit(1);
}
const soloComp = leerArg('--competicion');

// "11/10/2026" -> "2026-10-11"
const fechaISO = f => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);

function procesar(comp) {
  const base = path.join('data', 'raw', comp, TEMPORADA);
  if (!fs.existsSync(base)) return null;

  const partidos = [];
  for (const grupo of fs.readdirSync(base)) {
    const f = path.join(base, grupo, '_indice.json');
    if (!fs.existsSync(f)) continue;
    for (const p of JSON.parse(fs.readFileSync(f, 'utf8'))) {
      const jugado = /\d+\s*-\s*\d+/.test(p.resultado || '');
      partidos.push({
        id: p.id,
        grupo,
        jornada: numJornada(p.jornada),
        fecha: fechaISO(p.fecha),
        hora: p.hora || null,
        local: p.local.nombre,
        visitante: p.visitante.nombre,
        localId: p.local.id || null,
        visitanteId: p.visitante.id || null,
        ...(jugado ? { resultado: p.resultado } : {}),
      });
    }
  }
  if (!partidos.length) return null;

  partidos.sort((a, b) =>
    a.grupo.localeCompare(b.grupo) || a.jornada - b.jornada ||
    String(a.fecha).localeCompare(String(b.fecha)) || a.local.localeCompare(b.local));

  const jornadas = [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b);
  const datos = {
    competicion: comp,
    temporada: TEMPORADA,
    fuente: 'baloncestoenvivo.feb.es (scraper)',
    generado: new Date().toISOString().slice(0, 10),
    nota: 'Calendario de liga regular con fecha y hora oficiales. Los partidos ya disputados incluyen resultado.',
    jornadas: jornadas.length,
    partidos,
  };

  const dir = path.join('data', 'processed', comp, TEMPORADA);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'calendario.json'), JSON.stringify(datos, null, 1));

  const sinFecha = partidos.filter(p => !p.fecha).length;
  const jugados = partidos.filter(p => p.resultado).length;
  console.log(`${comp}: ${partidos.length} partidos · jornadas ${jornadas[0]}-${jornadas[jornadas.length - 1]}` +
              ` (${jornadas.length}) · ${jugados} jugados` +
              (sinFecha ? ` · ⚠ ${sinFecha} sin fecha` : ''));
  return partidos.length;
}

let total = 0;
for (const [id, comp] of Object.entries(COMPS)) {
  if (soloComp && id !== String(soloComp)) continue;
  const n = procesar(comp);
  if (n) total += n;
  else if (!soloComp) console.log(`${comp}: sin datos crudos de ${TEMPORADA}`);
}
console.log(`\n${total} partidos en total`);
