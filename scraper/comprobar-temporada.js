// Canario de transicion de temporada. Falla (exit 1) si estamos en el arranque
// de liga (mes >= 9) y la FEB aun ofrece una temporada mas reciente sin
// seleccionar (discrepancia): senal de que el pipeline seguiria trabajando sobre
// la temporada cerrada y publicando "actualizado hoy" sobre datos viejos, sin
// ningun otro error visible (ver ARQUITECTURA.md S17.2).
//
// Pensado para el workflow, SIN continue-on-error. Cuando la FEB mueva su
// selector a la temporada nueva, la discrepancia desaparece y el canario pasa a
// verde por si solo: ese es tambien el aviso de que ya se puede arrancar.
//
// Uso: node scraper/comprobar-temporada.js
const CFG = require('./config');
const { detectar } = require('./temporada-actual');

(async () => {
  const mes = new Date().getMonth() + 1;
  const enArranque = mes >= 9;   // la liga FEB arranca en septiembre/octubre
  const conflictos = [];

  for (const g of Object.keys(CFG.COMPETICIONES)) {
    const nombre = CFG.COMPETICIONES[g];
    try {
      const r = await detectar(g);
      console.log(`${nombre.padEnd(12)} seleccionada ${r.temporada} (${r.etiqueta})` +
        (r.discrepancia ? `  ⚠ existe una mas reciente sin seleccionar: ${r.maxima}` : '  ok'));
      if (r.discrepancia) conflictos.push({ nombre, ...r });
    } catch (e) {
      // Un fallo de deteccion (red, HTML cambiado) NO tumba el canario: su
      // trabajo es la discrepancia, no la disponibilidad de la FEB. Se avisa.
      console.log(`${nombre.padEnd(12)} no se pudo detectar (${e.message}) — se omite`);
    }
  }
  console.log('');

  if (enArranque && conflictos.length) {
    const { temporada, maxima } = conflictos[0];
    console.error('❌ DISCREPANCIA DE TEMPORADA EN EL ARRANQUE DE LIGA (mes ' + mes + ').');
    console.error('');
    console.error('La FEB ofrece la temporada ' + maxima + ', pero su web sigue seleccionando la ' +
      temporada + '. El pipeline usa la SELECCIONADA, asi que seguiria scrapeando y');
    console.error('publicando la ' + temporada + ' (cerrada) mientras la ' + maxima + ' ya ha empezado:');
    console.error('los datos quedarian congelados y la app anunciaria "actualizado hoy" sobre una');
    console.error('temporada terminada, sin ningun otro error visible.');
    console.error('');
    console.error('Que hacer:');
    console.error('  1. Comprueba en baloncestoenvivo.feb.es si la ' + maxima + ' ya tiene jornadas jugadas.');
    console.error('  2. Si es asi, arranca la ' + maxima + ': actualiza TEMPORADA_DEFECTO en');
    console.error('     scraper/config.js (o lanza el pipeline con --temporada ' + maxima + ').');
    console.error('  3. Si la liga ya rueda pero la FEB no ha movido su selector, fuerza la');
    console.error('     temporada a mano hasta que lo haga.');
    console.error('');
    console.error('Categorias afectadas: ' + conflictos.map(c => c.nombre).join(', '));
    process.exit(1);
  }

  if (conflictos.length) {
    console.log('Hay discrepancia, pero estamos fuera del arranque de liga (mes ' + mes +
      '): normal en pretemporada. No se bloquea.');
  } else {
    console.log('Sin discrepancias: la temporada seleccionada es la mas reciente en las tres categorias.');
  }
})().catch(e => { console.error('Error inesperado en el canario de temporada:', e.message); process.exit(1); });
