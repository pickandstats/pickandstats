// Prueba del "lunes sano" para scraper/vigilante.js (S17.11, issue #9): un
// vigilante hay que probarlo contra el caso bueno, no solo contra la alarma.
// El bug real (165,9 h de falso positivo el 19/10) nunca se habria visto
// provocando el fallo -- solo aparecia en la secuencia normal "el lunes entra
// un commit de datos, el despliegue tarda un par de horas en publicarlo".
//
// Prueba publicacionPendiente() directamente (exportada por vigilante.js),
// no el script completo: main() hace peticiones reales a GitHub y a la web
// desplegada, y no es lo que hay que fijar en el tiempo para esta prueba.
//
// Uso: node test/verificar-vigilante-publicacion.js
const { publicacionPendiente } = require('../scraper/vigilante');

let fallos = 0;
const comprobar = (etiqueta, cond) => {
  if (cond) console.log('   ✓ ' + etiqueta);
  else { fallos++; console.log('   ✗ ' + etiqueta); }
};

// --- Caso 1: el lunes sano, el que faltaba probar ---
// El commit de datos entra a las 14:43; el vigilante corre a las 16:31 (1h48m
// despues), con el despliegue todavia sin publicarlo. Exactamente la secuencia
// real del 19/10 que disparo el falso positivo.
console.log('### Lunes sano: datos a las 14:43, vigilante a las 16:31, sin desplegar todavia ###');
{
  const repo = new Date('2026-10-19T14:43:31.927Z');
  const desplegado = new Date('2026-10-12T17:51:00.000Z'); // el despliegue de la semana anterior
  const ahoraVigilante = new Date('2026-10-19T16:31:00.000Z').getTime();
  const { pendiente, horasPendiente } = publicacionPendiente(repo, desplegado, ahoraVigilante);
  comprobar('detecta que hay algo pendiente de publicar', pendiente === true);
  comprobar(`horasPendiente es ~1.8h, no las 165.9h del bug viejo (dio ${horasPendiente.toFixed(1)}h)`,
    Math.abs(horasPendiente - 1.8) < 0.1);
  comprobar('por debajo del umbral de 12h: el vigilante callaria', horasPendiente < 12);
}

// --- Caso 2: el despliegue ya publico, todo al dia ---
console.log('### Lunes normal, ya desplegado: los dos latidos coinciden ###');
{
  const mismaFecha = new Date('2026-10-19T17:51:00.000Z');
  const { pendiente, horasPendiente } = publicacionPendiente(mismaFecha, mismaFecha, Date.now());
  comprobar('no hay nada pendiente', pendiente === false);
  comprobar('horasPendiente es 0', horasPendiente === 0);
}

// --- Caso 3: un despliegue roto de verdad, para que la prueba no sea solo "todo apaga" ---
// Mismo commit del lunes a las 14:43, pero el vigilante corre 13 horas despues
// sin que nada se haya publicado -- mas del umbral de 12h.
console.log('### Despliegue roto de verdad: 13h pendiente, deberia sonar ###');
{
  const repo = new Date('2026-10-19T14:43:31.927Z');
  const desplegado = new Date('2026-10-12T17:51:00.000Z');
  const ahora13hDespues = new Date('2026-10-20T03:43:31.927Z').getTime();
  const { pendiente, horasPendiente } = publicacionPendiente(repo, desplegado, ahora13hDespues);
  comprobar('detecta que hay algo pendiente', pendiente === true);
  comprobar(`horasPendiente es ~13h (dio ${horasPendiente.toFixed(1)}h)`, Math.abs(horasPendiente - 13) < 0.1);
  comprobar('por encima del umbral de 12h: el vigilante sonaria', horasPendiente > 12);
}

console.log('');
console.log(fallos ? `❌ ${fallos} fallo(s).` : '✅ El vigilante calla en el lunes sano y suena en el roto de verdad.');
process.exit(fallos ? 1 : 0);
