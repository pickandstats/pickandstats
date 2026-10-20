// Genera test/actas-irreparables-origen.json a partir de los tres
// _informe-parcial.json de la reparacion en paralelo (ver
// scraper/reparar-cuartos-historicos.js). Reproducible a proposito: el registro
// de "irreparables" no se escribe a mano, se saca de lo que la reparacion ya
// comparo -- igual que test/partidos-cuartos-incompletos.json se genero sin red
// sobre lo ya cacheado, no a mano.
//
// Un partido entra en el registro cuando la reparacion lo marco `gana_vieja`:
// ni la extraccion nueva ni la vieja pasan verificarActa, y el desempate (mas
// parciales) se quedo con la vieja porque es la menos mala. El `motivo` que ya
// escribe reparar-cuartos-historicos.js se clasifica en tres `causa` distintas,
// porque no son la misma permanencia (ver _instrucciones.md del 15/10):
//
//   - acta_no_disponible: la nueva extraccion fallo porque la FEB ya no sirve
//     ese acta (podria dejar de ser cierto si la republica).
//   - empate_total: la FEB SI sirve el acta y verificarActa falla en las dos
//     copias por igual -- esto no va a cambiar nunca pidiendo de nuevo.
//   - vieja_mas_parciales: la vieja trae mas parciales que la nueva y las dos
//     fallan -- el re-fetch degrado y el desempate protegio la copia
//     buena-pero-insuficiente.
//
// `puntosPorCuarto` (anadido 20/10/2026, _instrucciones.md punto 4.1) es un
// eje distinto: si los PUNTOS de la copia activa cuadran cuarto a cuarto con
// partidos.json. Muchas entradas `empate_total`/`vieja_mas_parciales` fallan
// verificarActa por MINUTOS (el formato viejo solo trae `min` en el Cuarto 1),
// con los puntos intactos -- no es lo mismo que un acta a la que de verdad le
// faltan jugadores o puntos, y la diferencia importa para decidir que hacer
// con cada una.
//
// Uso: node scraper/generar-registro-irreparables.js
const fs = require('fs');
const path = require('path');

const COMPS = ['primerafeb', 'segundafeb', 'tercerafeb'];
const F_SALIDA = path.join('test', 'actas-irreparables-origen.json');

function causaDe(motivo) {
  if (motivo.startsWith('la nueva extraccion fallo')) return 'acta_no_disponible';
  if (motivo.startsWith('empate total')) return 'empate_total';
  if (motivo.startsWith('empate en verificarActa, la vieja trae mas parciales')) return 'vieja_mas_parciales';
  // Motivo no reconocido: mejor fallar aqui que meter una causa que no existe
  // en el registro -- el test de aceptacion asume que solo hay estas tres.
  throw new Error(`Motivo de gana_vieja sin causa reconocida: "${motivo}"`);
}

// `causa` dice por que gana_vieja. `puntosPorCuarto` dice algo distinto y
// ortogonal (_instrucciones.md 20/10, punto 4.1): si los PUNTOS de la copia
// que hoy esta activa en data/raw (la vieja, la que gano) cuadran cuarto a
// cuarto con la fuente oficial (partidos.json). verificarActa falla sumando
// MINUTOS; un acta con los 12/12 jugadores en los cuatro cuartos pero sin
// campo `min` fuera de Q1 (el formato viejo) tiene los puntos perfectos y
// solo le falta ese campo -- muy distinto de un acta a la que de verdad le
// faltan filas de jugador o puntos. Se calcula cruzando con la fuente
// oficial, no a mano, para que sea reproducible igual que `causa`.
//
// Suma puntos de JUGADOR en `porCuarto` (igual que el guardian de
// verificar-cuartos.js, S17.14), no `a.parciales`: `a.parciales` viene de la
// tabla del PDF del corte final de una pieza, y por eso es ciego exactamente
// al bug que mas importa aqui -- la frontera entre dos cuartos mal puesta
// por un corte intermedio perdido. Probado en este mismo registro: 7
// entradas (todas tercerafeb) tienen `a.parciales` perfecto pero `porCuarto`
// con puntos cambiados de cuarto -- el mismo bug de los 25 de Tercera 2025
// ya promovidos (ver _informe-cuarto-a-cuarto.md), aqui sin promover porque
// ademas fallan verificarActa por otra razon y se quedaron dentro del
// registro.
function puntosPorCuartoDe(comp, partido, cuartosOficialesPorComp) {
  const fActa = path.join('data', 'raw', comp, '2025', 'actas', `${partido}.json`);
  if (!fs.existsSync(fActa)) return 'no_legible';
  let a;
  try { a = JSON.parse(fs.readFileSync(fActa, 'utf8')); } catch (e) { return 'no_legible'; }
  const of = cuartosOficialesPorComp.get(String(partido));
  if (!Array.isArray(a.porCuarto) || !a.porCuarto.length || !Array.isArray(of) || !of.length) return 'no_legible';
  if (a.porCuarto.length !== of.length) return 'incorrectos';
  for (let i = 0; i < of.length; i++) {
    const cuarto = a.porCuarto[i], oficial = of[i];
    if (!cuarto) return 'incorrectos';
    const sumaLocal = ((cuarto[0] && cuarto[0].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
    const sumaVisitante = ((cuarto[1] && cuarto[1].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
    if (sumaLocal !== (oficial.local || 0) || sumaVisitante !== (oficial.visitante || 0)) return 'incorrectos';
  }
  return 'correctos';
}

const entradas = [];
const progreso = {};
let tercerCompleta = true;

for (const comp of COMPS) {
  const fInforme = path.join('data', 'raw-reparado', comp, '2025', '_informe-parcial.json');
  if (!fs.existsSync(fInforme)) {
    console.error(`❌ No existe ${fInforme}. ¿Ha corrido la reparacion para ${comp}?`);
    process.exit(1);
  }
  const comparados = JSON.parse(fs.readFileSync(fInforme, 'utf8'));
  progreso[comp] = comparados.length;

  const fActas = path.join('data', 'raw', comp, '2025', 'actas');
  const totalActas = fs.existsSync(fActas) ? fs.readdirSync(fActas).filter(f => f.endsWith('.json')).length : 0;
  if (comparados.length < totalActas) tercerCompleta = false;

  const fPartidos = path.join('data', 'processed', comp, '2025', 'partidos.json');
  const cuartosOficiales = fs.existsSync(fPartidos)
    ? new Map(JSON.parse(fs.readFileSync(fPartidos, 'utf8')).map(p => [String(p.id), p.cuartos]))
    : new Map();

  for (const c of comparados) {
    if (c.decision !== 'gana_vieja') continue;
    entradas.push({
      partido: c.partido, competicion: comp, causa: causaDe(c.motivo), motivo: c.motivo,
      parcialesViejo: c.parcialesViejo, parcialesNuevo: c.parcialesNuevo,
      puntosPorCuarto: puntosPorCuartoDe(comp, c.partido, cuartosOficiales),
    });
  }
}

const porCausa = {};
const porPuntosPorCuarto = {};
for (const e of entradas) {
  porCausa[e.causa] = (porCausa[e.causa] || 0) + 1;
  porPuntosPorCuarto[e.puntosPorCuarto] = (porPuntosPorCuarto[e.puntosPorCuarto] || 0) + 1;
}

const salida = {
  _comentario: 'Partidos de la temporada 2025 (cerrada) que la reparacion en paralelo marco ' +
    '`gana_vieja`: ni la extraccion nueva ni la vieja pasan verificarActa. Generado desde ' +
    'data/raw-reparado/*/2025/_informe-parcial.json por scraper/generar-registro-irreparables.js ' +
    '-- no se edita a mano, se regenera.',
  generado: new Date().toISOString(),
  progresoReparacionAlGenerar: progreso,
  provisional: !tercerCompleta,
  avisoSiProvisional: tercerCompleta ? undefined :
    'Tercera no habia terminado de compararse cuando se genero este registro. Las cifras -- ' +
    'sobre todo las de Tercera, donde se concentra lo malo -- se van a mover. Regenerar cuando ' +
    'termine, antes de usarlo para decidir la promocion.',
  porCausa,
  porPuntosPorCuarto,
  entradas,
};
if (salida.avisoSiProvisional === undefined) delete salida.avisoSiProvisional;

fs.writeFileSync(F_SALIDA, JSON.stringify(salida, null, 1));
console.log(`Escrito ${F_SALIDA}: ${entradas.length} entrada(s) (${JSON.stringify(porCausa)}).`);
console.log(`Puntos por cuarto vs fuente oficial: ${JSON.stringify(porPuntosPorCuarto)}`);
if (!tercerCompleta) {
  console.log(`⚠ Provisional: Tercera sigue comparando (${progreso.tercerafeb} comparados). Regenerar al terminar.`);
}
