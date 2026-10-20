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
// CRITERIO DE ACEPTACIÓN (reescrito el 15/10, ver _instrucciones.md de ese
// lote): el del 27/9 —"tras la reparación no debe fallar ninguno de los
// 534"— dejó de cumplirse en cuanto la propia reparación midió que 49 de los
// 534 no pasan NI con la extracción nueva NI con la vieja: no es que falte
// repararlos mejor, es que no se pueden reparar desde lo que la FEB sirve hoy.
// El criterio nuevo es el mismo idiom que partidos-cuartos-incompletos.json:
//
//   Tras la reparación, NINGÚN partido de los 534 falla, SALVO los que estén
//   en el registro de irreparables en origen (test/actas-irreparables-origen.json,
//   generado por scraper/generar-registro-irreparables.js desde los
//   _informe-parcial.json de la reparación -- no se edita a mano).
//
// Y el registro no puede acumular polvo: si una entrada del registro YA PASA
// el invariante (por ejemplo porque la FEB republicó el acta), este script
// también falla -- un registro que no se limpia se convierte en una alfombra
// bajo la que esconder cosas.
const fs = require('fs');
const path = require('path');

const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const segMinuto = mmss => { const [m, s] = String(mmss || '00:00').split(':').map(Number); return (m || 0) * 60 + (s || 0); };

const F_REGISTRO = path.join('test', 'actas-irreparables-origen.json');
let registro = { entradas: [], provisional: true };
if (fs.existsSync(F_REGISTRO)) {
  registro = JSON.parse(fs.readFileSync(F_REGISTRO, 'utf8'));
} else {
  console.log(`(no existe ${F_REGISTRO} todavía -- regenéralo con scraper/generar-registro-irreparables.js. ` +
    'Sin él, cualquier fallo cuenta como inesperado.)');
}
const clave = (comp, partido) => `${comp}|${partido}`;
const registroPorClave = new Map(registro.entradas.map(e => [clave(e.competicion, e.partido), e]));
// Dos cosas distintas que un registroPorClave.get() puede dejar sin marcar, y
// no pueden confundirse: "ya lo comprobe y NO falla" (alfombra de verdad, hay
// que quitarlo del registro) frente a "no he podido comprobarlo todavia" (acta
// sin regenerar con --forzar, o ni siquiera cacheada) -- lo segundo no dice
// nada sobre si la entrada sigue siendo valida.
const registroFalloConfirmado = new Set();
const registroVistoSinFallar = new Set();

let totalMedibles = 0, sinReparar = 0;
const fallosInesperados = [];
const fallosConocidos = [];

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
    // No contar esto como "ya paso": un registro no se limpia por una entrada
    // que no se ha podido comprobar todavia.
    const yaReparado = d.porCuarto.slice(1).every(cuarto =>
      !cuarto || [0, 1].every(ei => !cuarto[ei] || (cuarto[ei].jugadores || []).every(j => 'min' in j)));
    if (!yaReparado) { sinReparar++; continue; }
    totalMedibles++;

    const nProrrogas = Math.max(0, d.parciales.length - 4);
    const esperado = 200 * 60 + nProrrogas * 25 * 60;
    const ladoMal = [];

    for (let ei = 0; ei < 2; ei++) {
      // Sin "continue" si un cuarto no trae datos de este equipo: eso tiene
      // que CONTAR como 0 minutos, no saltarse la comprobacion -- un porCuarto
      // vacio en las 4 entradas tiene que descuadrar, no pasar sin querer.
      let suma = 0;
      for (const cuarto of d.porCuarto) {
        if (!cuarto || !cuarto[ei]) continue;
        for (const j of (cuarto[ei].jugadores || [])) suma += segMinuto(j.min);
      }
      if (suma !== esperado) ladoMal.push(ei === 0 ? 'local' : 'visitante');
    }

    const k = clave(COMPS[comp], d.partido);
    const enRegistro = registroPorClave.get(k);

    if (!ladoMal.length) {
      // Medible, y cuadra: si el registro dice que este partido es
      // irreparable, aqui es donde se demuestra que ya no lo es.
      if (enRegistro) registroVistoSinFallar.add(k);
      continue;
    }

    if (enRegistro) {
      registroFalloConfirmado.add(k);
      fallosConocidos.push({ partido: d.partido, competicion: COMPS[comp], ladoMal, causa: enRegistro.causa });
    } else {
      fallosInesperados.push({ partido: d.partido, competicion: COMPS[comp], ladoMal });
    }
  }
}

// Alfombra de verdad: el registro dice irreparable y el invariante, medido,
// dice que cuadra. Distinto de "no comprobable todavia" (acta sin regenerar
// con --forzar, o ni siquiera cacheada) -- eso no dice nada sobre si la
// entrada sigue siendo valida, asi que no cuenta como alfombra.
const alfombra = registro.entradas.filter(e => registroVistoSinFallar.has(clave(e.competicion, e.partido)));
const noComprobadasTodavia = registro.entradas.filter(e => {
  const k = clave(e.competicion, e.partido);
  return !registroFalloConfirmado.has(k) && !registroVistoSinFallar.has(k);
});

if (sinReparar) console.log(`(${sinReparar} actas cacheadas de antes de este arreglo, sin "min" en los cuartos 2-4: no medibles todavia, hace falta re-extraerlas)`);
console.log(`Medibles: ${totalMedibles}`);
console.log(`Fallos conocidos (en el registro de irreparables): ${fallosConocidos.length}`);
console.log(`Fallos inesperados (fuera del registro): ${fallosInesperados.length}`);
if (fallosInesperados.length) {
  console.log(fallosInesperados.map(f => `  ✗ ${f.partido} (${f.competicion}, ${f.ladoMal.join('+')})`).join('\n'));
}
if (alfombra.length) {
  console.log(`Entradas del registro que YA CUADRAN (alfombra, hay que quitarlas): ${alfombra.length}`);
  console.log(alfombra.map(e => `  ✗ ${e.partido} (${e.competicion}, causa: ${e.causa})`).join('\n'));
}
if (noComprobadasTodavia.length) {
  console.log(`(${noComprobadasTodavia.length} entrada(s) del registro sin comprobar todavia: su acta en data/raw ` +
    'no esta en formato medible -- necesita actas-cuartos.js --forzar, o la promocion de la reparacion. ' +
    'No cuentan como alfombra.)');
}
if (registro.provisional) {
  console.log(`\n⚠ El registro está marcado como provisional (${registro.avisoSiProvisional || 'reparación incompleta al generarlo'}).`);
}

const aceptado = fallosInesperados.length === 0 && alfombra.length === 0;
// La linea final tiene que decir cuanto del registro se ha medido de verdad
// (S17.13, 20/10): un "✓" que no toca ninguna entrada del registro -- porque
// todas estan "sin comprobar todavia" -- no significa "el registro es
// correcto", significa "no he podido comprobar nada de lo que este fichero
// afirma". Las dos cosas se ven igual en un solo caracter si no se dice la
// cifra.
const medidas = fallosConocidos.length + alfombra.length;
const totalRegistro = registro.entradas.length;
console.log('');
console.log(`Entradas del registro medidas: ${medidas} de ${totalRegistro}` +
  (noComprobadasTodavia.length ? ` (${noComprobadasTodavia.length} sin comprobar todavia)` : ''));
console.log(aceptado
  ? `✓ Criterio de aceptación cumplido: de las ${medidas} entradas del registro que se pudieron medir, las ${fallosConocidos.length} que fallan son las esperadas y ninguna sobra.` +
    (totalRegistro - medidas > 0 ? ` (${totalRegistro - medidas} entradas del registro siguen sin medirse -- este "✓" no dice nada sobre ellas.)` : '')
  : '✗ Criterio de aceptación NO cumplido (ver fallos inesperados y/o entradas de registro que ya pasan, arriba).');
process.exit(aceptado ? 0 : 1);
