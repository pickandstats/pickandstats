// Genera un fichero por partido con el boxscore de jugadores por cuarto, para
// la ficha de partido (carga diferida). Producto final servido a la app.
//
// Lee las actas (data/raw/<comp>/<temp>/actas/<id>.json) y escribe
// data/processed/<comp>/<temp>/boxscore-cuartos/<id>.json (el deploy lo
// copia a web/public/data -- ver S17.4/S17.7, no se escribe ahi directamente)
//
// DOS banderas, no una (_instrucciones.md 21/10, punto 2 -- correccion sobre
// el `completo` unico de ayer, que junto otra vez dos preguntas distintas y
// dejo sin desglose las actas con los puntos perfectos, formato viejo solo en
// `min`/`fc`/`fr`/`tap`):
//   - `puntosCompletos`: los cuatro cuartos tienen puntos que cuadran cuarto
//     a cuarto contra la fuente oficial (partidos.json.cuartos). Decide si la
//     app OFRECE el desglose. Un acta con un cuarto en 0-0 o con el
//     acumulado del partido metido en un cuarto (visto de verdad: 2484720,
//     Q3=0-0 y Q4=57-80) nunca pasa esto, pase lo que pase con `verificado`.
//   - `camposCompletosQ2a4`: los campos que el formato viejo solo trae en el
//     Cuarto 1 (min/fc/fr/tap/tapRec) estan de verdad en TODOS los cuartos.
//     Decide QUE COLUMNAS se pintan -- las que falten, `—` (web/src/Partido.jsx).
// Antes `completo` mezclaba las dos: una acta con puntos perfectos pero
// formato viejo dejaba de ofrecer desglose aunque lo unico que le faltara
// fuera la columna de minutos.
//
// Uso: node scraper/boxscore-cuartos.js --competicion 1 --temporada 2025
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
const fPartidos = path.join('data', 'processed', compNombre, temp, 'partidos.json');
const fFases = path.join('data', 'processed', compNombre, temp, 'fases.json');
if (!fs.existsSync(dirActas)) { console.error('No hay actas en', dirActas); process.exit(1); }
if (!fs.existsSync(fPartidos)) { console.error('No hay partidos.json en', fPartidos); process.exit(1); }

// partidos.json es la liga regular; los partidos de playoffs/ascensos viven
// en fases.json, anidados por fase, con el mismo campo `cuartos` -- sin esto,
// cualquier partido de fases se queda sin fuente oficial que consultar y
// `puntosCompletosDe` lo marca "no cuadra" por falta de dato, no porque el
// acta mienta (visto de verdad al medir: 18 partidos de Primera 2025, todos
// de Play-offs, perdian el desglose por este motivo antes de este arreglo).
const cuartosOficiales = new Map(
  JSON.parse(fs.readFileSync(fPartidos, 'utf8')).map(p => [String(p.id), p.cuartos])
);
if (fs.existsSync(fFases)) {
  for (const fase of JSON.parse(fs.readFileSync(fFases, 'utf8'))) {
    for (const p of fase.partidos || []) {
      if (p.cuartos) cuartosOficiales.set(String(p.id), p.cuartos);
    }
  }
}

// En data/processed como el resto (S17.4); el cp del deploy lo lleva a public.
const dirOut = path.join('data', 'processed', compNombre, temp, 'boxscore-cuartos');
fs.mkdirSync(dirOut, { recursive: true });

// Puntos de JUGADOR en `porCuarto` contra la fuente oficial, cuarto a cuarto
// -- mismo chequeo que el guardian de verificar-cuartos.js (S17.14) y
// `puntosPorCuartoDe` de generar-registro-irreparables.js, aqui por tercera
// vez porque es la pregunta que de verdad decide si se puede ofrecer desglose.
function puntosCompletosDe(porCuarto, of) {
  if (!Array.isArray(of) || !of.length || porCuarto.length !== of.length) return false;
  for (let i = 0; i < of.length; i++) {
    const cuarto = porCuarto[i], oficial = of[i];
    if (!cuarto) return false;
    const sumaLocal = ((cuarto[0] && cuarto[0].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
    const sumaVisitante = ((cuarto[1] && cuarto[1].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
    if (sumaLocal !== (oficial.local || 0) || sumaVisitante !== (oficial.visitante || 0)) return false;
  }
  return true;
}

// Formato viejo de acta (S17.6): min/fc/fr/tap/tapRec solo llegan reales en el
// Cuarto 1 -- fuera de el, esas claves no existen en absoluto en la fila de
// jugador (no es que valgan 0). Barato, sobre datos ya en memoria, se
// recalcula cada vez -- no hace falta cachear nada aqui.
//
// Comprueba los CINCO campos, no solo 'min' (_instrucciones.md 31/10, lote
// siguiente, punto 1): hasta hoy solo miraba 'min', asi que daba `true`
// (completo) aunque tap/tapRec/fc/fr siguieran faltando en Q2-4 por un bug
// de difJug ya corregido (extraer-acta.js) -- una acta podia pasar esta
// comprobacion sin que las otras cuatro columnas tuvieran dato de verdad.
const CAMPOS_FORMATO_VIEJO = ['min', 'tap', 'tapRec', 'fc', 'fr'];
const camposCompletosQ2a4 = porCuarto => porCuarto.slice(1).every(cuarto =>
  !cuarto || [0, 1].every(ei => !cuarto[ei] ||
    (cuarto[ei].jugadores || []).every(j => CAMPOS_FORMATO_VIEJO.every(c => c in j))));

let generados = 0, sinDesglose = 0, soloFormatoViejo = 0;
for (const fichero of fs.readdirSync(dirActas).filter(f => f.endsWith('.json'))) {
  const acta = JSON.parse(fs.readFileSync(path.join(dirActas, fichero), 'utf8'));
  if (!acta.porCuarto || !acta.porCuarto.length) continue;

  const puntosCompletos = puntosCompletosDe(acta.porCuarto, cuartosOficiales.get(String(acta.partido)));
  const camposCompletos = camposCompletosQ2a4(acta.porCuarto);
  if (puntosCompletos && !camposCompletos) soloFormatoViejo++;

  const salida = {
    partido: acta.partido,
    puntosCompletos,
    camposCompletosQ2a4: camposCompletos,
    nCuartos: acta.porCuarto.length,
    porCuarto: acta.porCuarto, // [cuarto][equipo].jugadores[] con los 20 campos
    // Si los minutos de un lado no verifican (actas-cuartos.js, S17.16): el
    // acta cruda en data/raw lo lleva, pero data/raw es gitignored y la app
    // nunca la lee -- sin copiar este campo aqui, Partido.jsx no tiene forma
    // de saber que avisar (_instrucciones.md 31/10, lote siguiente, punto 1).
    ...(acta.minutosNoVerifican ? { minutosNoVerifican: acta.minutosNoVerifican } : {}),
  };
  fs.writeFileSync(path.join(dirOut, acta.partido + '.json'), JSON.stringify(salida));
  generados++;
  if (!puntosCompletos) sinDesglose++;
}

console.log(`${compNombre} ${temp}: ${generados} ficheros de boxscore por cuarto` +
  (sinDesglose ? ` (${sinDesglose} sin desglose en la app: puntos no cuadran cuarto a cuarto)` : '') +
  (soloFormatoViejo ? ` [${soloFormatoViejo} con desglose pero en formato viejo: min/fc/fr/tap se pintaran como "—" fuera de Q1]` : ''));
