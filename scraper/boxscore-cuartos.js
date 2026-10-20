// Genera un fichero por partido con el boxscore de jugadores por cuarto, para
// la ficha de partido (carga diferida). Producto final servido a la app.
//
// Lee las actas (data/raw/<comp>/<temp>/actas/<id>.json) y escribe
// web/public/data/<comp>/<temp>/boxscore-cuartos/<id>.json
//
// Marca 'completo' si el partido tiene todos los cuartos sin huecos: solo
// entonces la app permitira el desglose (sumar cuartos == total del partido).
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
if (!fs.existsSync(dirActas)) { console.error('No hay actas en', dirActas); process.exit(1); }

// En data/processed como el resto (S17.4); el cp del deploy lo lleva a public.
const dirOut = path.join('data', 'processed', compNombre, temp, 'boxscore-cuartos');
fs.mkdirSync(dirOut, { recursive: true });

// Formato viejo de acta (S17.6): min/fc/fr/tap/tapRec solo llegan reales en el
// Cuarto 1 -- fuera de el, esas claves no existen en absoluto en la fila de
// jugador (no es que valgan 0). `completo` ya exigia que `verificado` (puntos
// por jugador cuadrando con el total) no fuera false, pero ese chequeo nunca
// miro estos campos -- asi que servia el desglose igual, con un hueco que la
// app convertia en columnas falsas (_informe-irreparables-min.md, 20/10).
// Mismo idioma que `minEnQ2a4` de verificar-cuartos.js: barato, sobre datos ya
// en memoria, se recalcula cada vez -- no hace falta cachear nada aqui.
const camposCompletosQ2a4 = porCuarto => porCuarto.slice(1).every(cuarto =>
  !cuarto || [0, 1].every(ei => !cuarto[ei] || (cuarto[ei].jugadores || []).every(j => 'min' in j)));

let generados = 0, incompletos = 0, porFormatoViejo = 0;
for (const fichero of fs.readdirSync(dirActas).filter(f => f.endsWith('.json'))) {
  const acta = JSON.parse(fs.readFileSync(path.join(dirActas, fichero), 'utf8'));
  if (!acta.porCuarto || !acta.porCuarto.length) continue;

  // completo: ningun cuarto null, al menos 4, verificado, y con los campos
  // reales en todos los cuartos (no solo en Q1). Los truncados, con hueco
  // intermedio, sin verificar o en formato viejo se marcan incompletos -> la
  // app no ofrecera el desglose.
  const sinHuecos = acta.porCuarto.every(c => c !== null);
  const formatoViejo = !camposCompletosQ2a4(acta.porCuarto);
  const completo = sinHuecos && acta.porCuarto.length >= 4 && acta.verificado !== false && !formatoViejo;
  if (formatoViejo && sinHuecos && acta.porCuarto.length >= 4 && acta.verificado !== false) porFormatoViejo++;

  const salida = {
    partido: acta.partido,
    completo,
    nCuartos: acta.porCuarto.length,
    porCuarto: acta.porCuarto, // [cuarto][equipo].jugadores[] con los 20 campos
  };
  fs.writeFileSync(path.join(dirOut, acta.partido + '.json'), JSON.stringify(salida));
  generados++;
  if (!completo) incompletos++;
}

console.log(`${compNombre} ${temp}: ${generados} ficheros de boxscore por cuarto` +
  (incompletos ? ` (${incompletos} incompletos, sin desglose en la app)` : '') +
  (porFormatoViejo ? ` [${porFormatoViejo} de ellos solo por formato viejo sin min/fc/fr/tap fuera de Q1]` : ''));
