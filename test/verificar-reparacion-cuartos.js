// Prueba de aceptación de la reparación de "actas por cuartos incompletas"
// (ver test/partidos-cuartos-incompletos.json). Escrita ANTES de reparar nada,
// a propósito, para no mover el criterio después de ver el resultado.
//
// Ahora que difJug() conserva "min" diferenciado en los 4 cuartos (S17.6), el
// invariante ya no necesita el proxy de puntos ni el de "solo Q1 = 50:00": basta
// sumar los minutos de los 4 cortes por jugador y compararlo con
// 200:00 + 25:00 x nº de prórrogas, igual que hace verificarActa() sobre el
// acta final, pero aplicado a la reconstrucción por cuartos.
//
// Uso: node test/verificar-reparacion-cuartos.js
//
// Criterio de aceptación para cuando se repare (semana del 5 de octubre):
// correr este script sobre los datos reparados tiene que dejar EXACTAMENTE
// UN partido sin cuadrar -- 2484716 -- y NINGÚN otro de los 534 que hoy están
// en partidos-cuartos-incompletos.json.
//
// Por qué solo uno y no "los 41 sin-Q1" que se pensaba al escribir el encargo:
// se investigó 2484716 (ver _informe de esta tanda) y es un fallo DISTINTO al
// del nombre envuelto -- el PDF de ese partido usa el carácter Unicode "∶"
// (RATIO, U+2236) en vez de ":" (U+003A) en todos los MM:SS, así que
// parseJugador no reconoce NINGUNA fila y el acta queda vacía de jugadores de
// principio a fin. Unir líneas no arregla eso (no hay ':' que encontrar por
// mucho que se junten líneas). Verificado independientemente contra las 2537
// actas cacheadas: es el ÚNICO caso así en toda la base, no 41 -- los otros 40
// del grupo "solo puntos" de partidos-cuartos-incompletos.json tienen el
// cuarto 1 sano de verdad (el jugador perdido entra a partir del cuarto 2), y
// el arreglo del nombre envuelto sí los cubre.
//
// Si al repasar esto tras la reparación quedan MÁS de 1, el arreglo no cubre
// todo lo que se creía. Si queda MENOS de 1 (es decir, 0 -- si hasta 2484716
// queda resuelto), significa que se ha tocado también el caso del carácter
// "∶", que no estaba en el alcance de esta reparación: hay que confirmar que
// fue intencional antes de darlo por bueno.
const fs = require('fs');
const path = require('path');

const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const segMinuto = mmss => { const [m, s] = String(mmss || '00:00').split(':').map(Number); return (m || 0) * 60 + (s || 0); };

let totalMedibles = 0, sinReparar = 0;
const fallos = [];

for (const comp of [1, 2, 3]) {
  const dir = path.join('data', 'raw', COMPS[comp], '2025', 'actas');
  if (!fs.existsSync(dir)) continue;
  const ficheros = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const f of ficheros) {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { continue; }
    if (!d.porCuarto || !d.parciales) continue;
    // Actas genuinamente truncadas (menos de 4 cortes, o completo:false): es
    // OTRA categoria ya conocida (S17.1), no la del nombre envuelto -- no
    // entran en esta prueba de aceptacion.
    if (d.completo === false || d.porCuarto.length < 4) continue;

    // Ficheros generados ANTES de este arreglo no tienen "min" en los cuartos
    // 2-4 (difJug no lo copiaba): no son medibles con este criterio todavia,
    // hace falta volver a generarlos con actas-cuartos.js --forzar primero.
    // Sin este filtro, un "min" ausente se leeria como 0 y el script marcaria
    // CASI TODO como descuadrado, no por el bug, sino por el formato viejo.
    const yaReparado = d.porCuarto.slice(1).every(cuarto =>
      !cuarto || [0, 1].every(ei => !cuarto[ei] || (cuarto[ei].jugadores || []).every(j => 'min' in j)));
    if (!yaReparado) { sinReparar++; continue; }
    totalMedibles++;

    const nProrrogas = Math.max(0, d.parciales.length - 4);
    const esperado = 200 * 60 + nProrrogas * 25 * 60;
    const ladoMal = [];

    for (let ei = 0; ei < 2; ei++) {
      // Sin "continue" si un cuarto no trae datos de este equipo: eso tiene
      // que CONTAR como 0 minutos, no saltarse la comprobacion -- es
      // exactamente el caso de 2484716 (porCuarto vacio en las 4 entradas):
      // si se salta por "no medible", el peor caso pasa la prueba sin querer.
      let suma = 0;
      for (const cuarto of d.porCuarto) {
        if (!cuarto || !cuarto[ei]) continue;
        for (const j of (cuarto[ei].jugadores || [])) suma += segMinuto(j.min);
      }
      if (suma !== esperado) ladoMal.push(ei === 0 ? 'local' : 'visitante');
    }

    if (ladoMal.length) fallos.push({ partido: d.partido, competicion: COMPS[comp], ladoMal });
  }
}

if (sinReparar) console.log(`(${sinReparar} actas cacheadas de antes de este arreglo, sin "min" en los cuartos 2-4: no medibles todavia, hace falta re-extraerlas)`);
console.log(`Medibles: ${totalMedibles}`);
console.log(`Con el invariante de 4 cuartos descuadrado: ${fallos.length}`);
if (fallos.length) console.log(fallos.map(f => `${f.partido} (${f.competicion}, ${f.ladoMal.join('+')})`).join('\n'));

const soloEsperado = fallos.length === 1 && fallos[0].partido === '2484716';
console.log('');
console.log(soloEsperado
  ? '✓ Criterio de aceptacion cumplido: solo 2484716 sigue descuadrado.'
  : `✗ Criterio de aceptacion NO cumplido (se esperaba exactamente 2484716, ha salido: ${fallos.map(f=>f.partido).join(', ') || 'ninguno'}).`);
process.exit(soloEsperado ? 0 : 1);
