// Verifica que las actas por cuartos de una categoria estan completas y coherentes
// ANTES de generar agregados y boxscore. Evita generar sobre datos a medias.
//
// Uso: node scraper/verificar-cuartos.js --competicion 3 --temporada 2025
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const comp = val('--competicion') || '1';
const temp = val('--temporada') || '2025';
const compNombre = COMPS[comp];
if (!compNombre) { console.error('Competicion no valida'); process.exit(1); }

const dirActas = path.join('data', 'raw', compNombre, temp, 'actas');
const fPartidos = path.join('web', 'public', 'data', compNombre, temp, 'partidos.json');
if (!fs.existsSync(dirActas)) { console.error('No hay actas en', dirActas); process.exit(1); }
if (!fs.existsSync(fPartidos)) { console.error('No hay partidos.json en', fPartidos); process.exit(1); }

const partidos = JSON.parse(fs.readFileSync(fPartidos, 'utf8'));
const idsEsperados = new Set(partidos.map(p => String(p.id)));
const ficheros = fs.readdirSync(dirActas).filter(f => f.endsWith('.json'));
const idsPresentes = new Set(ficheros.map(f => f.replace('.json', '')));

// 1) Cobertura: actas presentes vs partidos esperados
const faltan = [...idsEsperados].filter(id => !idsPresentes.has(id));

// 2/3/4) Recorrer actas: contexto, completitud, coherencia
let conContexto = 0, sinContexto = 0, completas = 0, truncadas = 0, rendidas = 0;
const sinContextoIds = [], truncadasIds = [], rendidasIds = [];
let sumPintura = 0, nPintura = 0, valoresRaros = 0;
// campo -> { q1solo, conDatos }: detecta campos que llegan enteros en Q1 (ver abajo)
const concentrados = {};
const LIMITE_INTENTOS = 4;

for (const f of ficheros) {
  const a = JSON.parse(fs.readFileSync(path.join(dirActas, f), 'utf8'));

  // Actas rendidas: actas-cuartos.js las reintento LIMITE_INTENTOS veces sin
  // lograr que quedaran sanas (la FEB no las completa). Se tratan como las
  // truncadas: se reportan en su propia linea y NO bloquean. Sin esto, una
  // rendida sin contexto contaria en "sinContexto" y congelaria los cuartos de
  // toda la categoria para siempre — el caso (a) de ARQUITECTURA.md S17.1.
  if ((a.intentos || 0) >= LIMITE_INTENTOS) {
    rendidas++; if (rendidasIds.length < 8) rendidasIds.push(a.partido);
    continue;
  }

  if (a.contextoPorCuarto) conContexto++; else { sinContexto++; if (sinContextoIds.length < 8) sinContextoIds.push(a.partido); }
  if (a.completo && a.verificado !== false) completas++; else { truncadas++; if (truncadasIds.length < 8) truncadasIds.push(a.partido); }

  // Coherencia del contexto: solo se exige en actas fiables (completo y
  // verificado). En actas truncadas/incoherentes el desglose por resta de
  // cortes puede dar valores imposibles, pero su contexto no se usa en la app,
  // asi que no debe bloquear la generacion.
  const actaFiable = a.completo && a.verificado !== false;
  if (actaFiable && a.contextoPorCuarto) for (const q of a.contextoPorCuarto) {
    if (q && q.pintura) {
      const tot = (q.pintura.local || 0) + (q.pintura.visitante || 0);
      sumPintura += tot; nPintura++;
      if (tot < 0 || tot > 60) valoresRaros++;
    }
  }

  // Campos NO acumulativos disfrazados de acumulativos. Si un campo trae todo su
  // valor en Q1 y cero en el resto, la fuente lo esta publicando como TOTAL DE
  // PARTIDO repetido en cada corte, y la resta de cortes lo vuelca entero en Q1.
  // Es exactamente lo que pasaba con trasPerdida (8/9/2026): el dato parecia por
  // periodo, se pintaba por periodo, y era basura en el 96% de los partidos.
  // NO bloquea: es una propiedad del acta de la FEB, no un fallo del pipeline.
  // Pero tiene que verse, porque el siguiente campo que la FEB publique asi
  // entraria igual de silencioso.
  if (actaFiable && a.contextoPorCuarto && a.contextoPorCuarto.length >= 4) {
    const qs = a.contextoPorCuarto.slice(0, 4);
    const campos = new Set();
    qs.forEach(q => q && Object.keys(q).forEach(c => campos.add(c)));
    for (const c of campos) {
      const tot = i => { const q = qs[i]; return (q && q[c]) ? (q[c].local || 0) + (q[c].visitante || 0) : 0; };
      const q1 = tot(0), resto = tot(1) + tot(2) + tot(3);
      if (q1 + resto === 0) continue;               // sin datos de ese campo: no cuenta
      if (!concentrados[c]) concentrados[c] = { q1solo: 0, conDatos: 0 };
      concentrados[c].conDatos++;
      if (resto === 0 && q1 > 0) concentrados[c].q1solo++;
    }
  }
}

const mediaPintura = nPintura ? (sumPintura / nPintura).toFixed(1) : '?';

console.log(`\n=== VERIFICACION DE CUARTOS · ${compNombre} ${temp} ===\n`);
console.log(`Partidos esperados (partidos.json): ${idsEsperados.size}`);
console.log(`Actas presentes:                    ${ficheros.length}`);
console.log(`Actas que faltan:                   ${faltan.length}${faltan.length && faltan.length <= 8 ? ' -> ' + faltan.join(', ') : faltan.length ? ' (primeras: ' + faltan.slice(0, 8).join(', ') + ')' : ''}`);
console.log('');
console.log(`CON contextoPorCuarto:              ${conContexto}`);
console.log(`SIN contexto (re-extraer):          ${sinContexto}${sinContexto ? ' -> ej: ' + sinContextoIds.join(', ') : ''}`);
console.log('');
console.log(`Completas (4 cuartos, sin huecos):  ${completas}`);
console.log(`Truncadas / con hueco:              ${truncadas}${truncadas ? ' -> ej: ' + truncadasIds.join(', ') : ''}`);
console.log(`Rendidas (>=${LIMITE_INTENTOS} intentos, no bloquean): ${rendidas}${rendidas ? ' -> ej: ' + rendidasIds.join(', ') : ''}`);
console.log('');
console.log(`Coherencia · pintura media/cuarto:  ${mediaPintura} pts (esperado ~14-24 sumando ambos equipos)`);
console.log(`Valores fuera de rango:             ${valoresRaros}`);
console.log('');
console.log('Contexto concentrado en Q1 (senal de "total de partido", no por periodo):');
const sospechosos = [];
const entradas = Object.entries(concentrados);
if (!entradas.length) console.log('  (sin contexto que comprobar)');
for (const [c, d] of entradas) {
  const pct = d.conDatos ? (100 * d.q1solo / d.conDatos) : 0;
  if (pct >= 50) sospechosos.push(`${c} (${pct.toFixed(0)}%)`);
  console.log(`  ${c.padEnd(20)} ${d.q1solo}/${d.conDatos} actas = ${pct.toFixed(1)}%${pct >= 50 ? '  <-- REVISAR' : ''}`);
}
console.log('');

// Aviso que NO bloquea: un campo asi no impide generar, pero no se puede pintar
// por cuarto. La accion es sacarlo de CAMPOS_ACUM en extraer-acta.js y del
// contexto por cuarto, como se hizo con trasPerdida.
if (sospechosos.length) {
  console.log('AVISO (no bloquea): ' + sospechosos.join(', ') + ' llegan concentrados en Q1.');
  console.log('  -> La FEB publica ese campo como total de partido, no por periodo.');
  console.log('     Sacarlo de CAMPOS_ACUM en extraer-acta.js y del contexto por cuarto.');
  console.log('');
}

// Veredicto
const problemas = [];
if (sinContexto > 0) problemas.push(`${sinContexto} actas sin contexto`);
if (valoresRaros > 0) problemas.push(`${valoresRaros} valores raros`);

if (problemas.length === 0) {
  console.log('VEREDICTO: LISTO para generar agregados y boxscore.');
  console.log(`(${faltan.length} partidos sin acta, ${truncadas} truncados y ${rendidas} rendidos son normales; la app los maneja.)`);
} else {
  console.log('VEREDICTO: NO generar todavia. Problemas: ' + problemas.join('; ') + '.');
  if (sinContexto > 0) console.log('  -> Borra las actas sin contexto y re-extrae (sin --forzar) antes de generar.');
}
console.log('');
// Codigo de salida: 1 si hay problemas (util en CI para que el paso quede marcado)
process.exit(problemas.length ? 1 : 0);
console.log('');
