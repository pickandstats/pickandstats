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

  for (const c of comparados) {
    if (c.decision !== 'gana_vieja') continue;
    entradas.push({
      partido: c.partido, competicion: comp, causa: causaDe(c.motivo), motivo: c.motivo,
      parcialesViejo: c.parcialesViejo, parcialesNuevo: c.parcialesNuevo,
    });
  }
}

const porCausa = {};
for (const e of entradas) porCausa[e.causa] = (porCausa[e.causa] || 0) + 1;

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
  entradas,
};
if (salida.avisoSiProvisional === undefined) delete salida.avisoSiProvisional;

fs.writeFileSync(F_SALIDA, JSON.stringify(salida, null, 1));
console.log(`Escrito ${F_SALIDA}: ${entradas.length} entrada(s) (${JSON.stringify(porCausa)}).`);
if (!tercerCompleta) {
  console.log(`⚠ Provisional: Tercera sigue comparando (${progreso.tercerafeb} comparados). Regenerar al terminar.`);
}
