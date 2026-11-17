// TAP/TR/FC/FR por cuartos contra el total del partido del HTML, jugador a
// jugador (lote 35, punto 1).
//
// El comparador de --reextraer nunca comparo con la copia vieja (lote 33, caso
// adversario): miraba la nueva y la daba por buena si cuadraban puntos y
// minutos. Una degradacion que pusiera ceros en tapones o faltas habria pasado.
// Aqui se usa una segunda fuente independiente de esos campos: el boxscore del
// HTML (scrape.js) trae por jugador el total del partido -- tf (tapones
// puestos), tco (recibidos), fc y fr --, y el acta los trae por cuarto. La suma
// sobre los periodos (prorrogas incluidas) tiene que dar el total, jugador a
// jugador. Mismo idiom que el cruce cuarto a cuarto de puntos
// (boxscore-cuartos.js, puntosCompletosDe).
//
// No aplica (y se cuenta aparte, no como "cuadra"):
//   - formato viejo (`camposCompletosQ2a4: false`): esos campos solo vienen en
//     Q1; un campo ausente no es un cero, asi que la suma NO puede cuadrar.
//   - partidos sin boxscore HTML.
//   - TR (tapones recibidos) en un acta que no trae ninguno: las actas de
//     2026/27 imprimen "TAP Rec" a 0 en todas las filas, Totales incluidos
//     (visto en el PDF publico de 2525757; en 2026/27 solo 2 de 623 actas
//     traen algun TR, en 2025/26 1084 de 1853). Es dato ausente en la fuente,
//     no una degradacion nuestra: se comparan TAP/FC/FR y se cuenta aparte.
// Los minutos no se miran: las actas con `minutosNoVerifican` llevan minutos
// vaciados a proposito y este chequeo no las roza.
//
// Lee data/processed (boxscore-cuartos/ y partidos.json), sin red. Escribe
// data/processed/<comp>/<temp>/campos-cuartos.json y sale con 1 si algun acta
// tiene un deficit de DEFICIT_CRITICO o mas frente al HTML, o si no se ha
// podido comparar ninguna.
//
// Uso: node scraper/verificar-campos-cuartos.js --competicion 3 --temporada 2026
//      [--ids 2537579,2537580]  (solo esos partidos; para la muestra de control)
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const compNombre = COMPS[val('--competicion') || '3'];
const temp = val('--temporada') || '2026';
const soloIds = val('--ids') ? new Set(val('--ids').split(',')) : null;
if (!compNombre) { console.error('Competicion no valida'); process.exit(1); }

// campo del acta -> campo del boxscore HTML
const CAMPOS = { tap: 'tf', tapRec: 'tco', fc: 'fc', fr: 'fr' };
// El acta escribe "00" donde el HTML escribe "0" (visto en 2525757).
const dorsalDe = d => String(d).replace(/^0+(?=\d)/, '');
const traeTR = acta => acta.porCuarto.some(q => (q || []).some(e => ((e && e.jugadores) || []).some(j => j.tapRec > 0)));

const dirBox = path.join('data', 'processed', compNombre, temp, 'boxscore-cuartos');
const partidos = new Map(JSON.parse(fs.readFileSync(path.join('data', 'processed', compNombre, temp, 'partidos.json'), 'utf8'))
  .map(p => [String(p.id), p]));

// Devuelve null si cuadra, o la lista de diferencias.
function compararActa(acta, html) {
  const difs = [];
  const campos = Object.entries(CAMPOS).filter(([a]) => a !== 'tapRec' || traeTR(acta));
  ['local', 'visitante'].forEach((lado, ei) => {
    const suma = new Map();
    for (const cuarto of acta.porCuarto) {
      for (const j of (cuarto && cuarto[ei] && cuarto[ei].jugadores) || []) {
        const s = suma.get(dorsalDe(j.dorsal)) || { nombre: j.nombre, tap: 0, tapRec: 0, fc: 0, fr: 0 };
        for (const c of Object.keys(CAMPOS)) s[c] += j[c] || 0;
        suma.set(dorsalDe(j.dorsal), s);
      }
    }
    for (const h of html[lado]) {
      const s = suma.get(dorsalDe(h.dorsal));
      // Un jugador del HTML que no esta en el acta solo es un error si tiene
      // algo que sumar (los que no jugaron salen con todo a 0 en el HTML).
      if (!s) {
        const conDato = campos.map(([, k]) => k).filter(k => h[k]);
        if (conDato.length) difs.push(`${lado} #${h.dorsal} ${h.nombre}: no esta en el acta (${conDato.map(k => `${k}=${h[k]}`).join(', ')})`);
        continue;
      }
      const malos = campos.filter(([a, k]) => s[a] !== (h[k] || 0));
      if (malos.length) difs.push(`${lado} #${h.dorsal} ${h.nombre}: ${malos.map(([a, k]) => `${a} acta ${s[a]} / html ${h[k] || 0}`).join(', ')}`);
    }
  });
  return difs.length ? difs : null;
}

const DEFICIT_CRITICO = 2;

// Lo que el acta tiene de MENOS que el HTML, por equipo y campo (el maximo).
// Una degradacion (ceros donde habia valores) siempre deja el acta por debajo;
// la diferencia normal entre fuentes en 2026/27 va al reves (el acta cuenta
// alguna falta mas que el HTML: 124 de 128 diferencias medidas el 17/11) y por
// debajo nunca pasa de 1. Por eso el resumen de salud marca critico un deficit
// de 2 o mas, y el resto solo lo cuenta.
function deficitMaximo(acta, html) {
  let max = 0;
  ['local', 'visitante'].forEach((lado, ei) => {
    for (const [a, k] of Object.entries(CAMPOS)) {
      if (a === 'tapRec' && !traeTR(acta)) continue;
      const enActa = acta.porCuarto.reduce((s, q) => s + ((q && q[ei] && q[ei].jugadores) || []).reduce((t, j) => t + (j[a] || 0), 0), 0);
      const enHtml = html[lado].reduce((s, j) => s + (j[k] || 0), 0);
      max = Math.max(max, enHtml - enActa);
    }
  });
  return max;
}

function main() {
  if (!fs.existsSync(dirBox)) { console.error('No hay', dirBox); process.exit(1); }
  const res = { comp: compNombre, temporada: temp, fecha: new Date().toISOString().slice(0, 10),
    comparadas: 0, cuadran: 0, sinTR: 0, formatoViejo: 0, sinHtml: 0, noCuadran: [] };
  for (const f of fs.readdirSync(dirBox).filter(f => f.endsWith('.json'))) {
    const acta = JSON.parse(fs.readFileSync(path.join(dirBox, f), 'utf8'));
    const id = String(acta.partido);
    if (soloIds && !soloIds.has(id)) continue;
    if (!acta.camposCompletosQ2a4) { res.formatoViejo++; continue; }
    const html = partidos.get(id)?.boxscore;
    if (!html) { res.sinHtml++; continue; }
    res.comparadas++;
    if (!traeTR(acta)) res.sinTR++;
    const difs = compararActa(acta, html);
    if (difs) res.noCuadran.push({ id, deficit: deficitMaximo(acta, html), difs });
    else res.cuadran++;
  }
  if (!soloIds) fs.writeFileSync(path.join('data', 'processed', compNombre, temp, 'campos-cuartos.json'), JSON.stringify(res, null, 1) + '\n');
  console.log(`${compNombre} ${temp}: ${res.comparadas} comparadas, ${res.cuadran} cuadran, ${res.noCuadran.length} NO cuadran` +
    ` (${res.sinTR} sin TR en el acta: TR no comparado) | no aplica: ${res.formatoViejo} formato viejo, ${res.sinHtml} sin boxscore HTML`);
  for (const n of res.noCuadran.slice(0, 15)) console.log(`  ✗ ${n.id}: ${n.difs.slice(0, 3).join(' · ')}${n.difs.length > 3 ? ` (+${n.difs.length - 3})` : ''}`);
  // Un verificador que no compara nada no es un verificador.
  if (!res.comparadas) { console.log('  ⚠ ninguna acta comparada'); process.exit(1); }
  const degradadas = res.noCuadran.filter(n => n.deficit >= DEFICIT_CRITICO);
  if (degradadas.length) console.log(`  ✗ ${degradadas.length} acta(s) con un deficit de ${DEFICIT_CRITICO} o mas frente al HTML: ${degradadas.map(n => n.id).join(', ')}`);
  process.exit(degradadas.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { compararActa, deficitMaximo };
