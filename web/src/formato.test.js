// Prueba de la capa de formato (_instrucciones.md 23/10, punto 2). Trivial
// a proposito -- una tabla entrada -> salida esperada -- pero vale para
// siempre: si alguien cambia el espacio normal por el duro en pct1, o deja
// que el 0 lleve signo en s1, esto lo dice.
//
// Uso: node web/src/formato.test.js
import { n0, n1, n2, s1, pct1 } from './formato.js';

let fallos = 0;
const comprobar = (etiqueta, obtenido, esperado) => {
  if (obtenido === esperado) { console.log('   ✓ ' + etiqueta); }
  else { fallos++; console.log(`   ✗ ${etiqueta}: esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(obtenido)}`); }
};

const ESPACIO_DURO = ' ';

console.log('### Los cinco casos de la tabla ###');
comprobar('n0(7.3)', n0(7.3), '7');
comprobar('n0(-6.7)', n0(-6.7), '-7');
comprobar('n0(0)', n0(0), '0');

comprobar('n1(7.3)', n1(7.3), '7,3');
comprobar('n1(-6.7)', n1(-6.7), '-6,7');
comprobar('n1(0)', n1(0), '0,0');

comprobar('n2(7.3)', n2(7.3), '7,30');
comprobar('n2(-6.7)', n2(-6.7), '-6,70');
comprobar('n2(0)', n2(0), '0,00');

comprobar('s1(7.3)', s1(7.3), '+7,3');
comprobar('s1(-6.7)', s1(-6.7), '-6,7');
comprobar('s1(0)', s1(0), '0,0');

comprobar('pct1(7.3)', pct1(7.3), `7,3${ESPACIO_DURO}%`);
comprobar('pct1(0)', pct1(0), `0,0${ESPACIO_DURO}%`);

console.log('\n### El contrato de bordes ###');
for (const [nombre, fn] of Object.entries({ n0, n1, n2, s1, pct1 })) {
  comprobar(`${nombre}(null)`, fn(null), '—');
  comprobar(`${nombre}(undefined)`, fn(undefined), '—');
  comprobar(`${nombre}(NaN)`, fn(NaN), '—');
  comprobar(`${nombre}("3-2") pasa tal cual`, fn('3-2'), '3-2');
}

console.log('\n### El espacio duro de pct1, exacto ###');
comprobar('pct1(7.3) lleva U+00A0, no un espacio normal', pct1(7.3).includes(ESPACIO_DURO), true);
comprobar('pct1(7.3) NO lleva un espacio ASCII antes del %', pct1(7.3).includes(' %'), false);

console.log('\n### El signo del cero en s1, exacto ###');
comprobar('s1(0) no lleva "+"', s1(0).startsWith('+'), false);
comprobar('s1(-0) tampoco lleva signo', s1(-0), '0,0');

console.log(fallos ? `\n❌ ${fallos} fallo(s).` : '\n✅ La capa de formato cuadra en los cinco casos y en los bordes.');
process.exit(fallos ? 1 : 0);
