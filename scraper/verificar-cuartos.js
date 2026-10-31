// Verifica que las actas por cuartos de una categoria estan completas y coherentes
// ANTES de generar agregados y boxscore. Evita generar sobre datos a medias.
//
// Uso: node scraper/verificar-cuartos.js --competicion 3 --temporada 2025
const fs = require('fs');
const path = require('path');
const { verificarActa, equiposDesdePorCuarto } = require('./extraer-acta');
const { scrapePartido } = require('./scrape');
const CFG = require('./config');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const comp = val('--competicion') || '1';
const temp = val('--temporada') || '2025';
const compNombre = COMPS[comp];
if (!compNombre) { console.error('Competicion no valida'); process.exit(1); }

const dirActas = path.join('data', 'raw', compNombre, temp, 'actas');
const fPartidos = path.join('data', 'processed', compNombre, temp, 'partidos.json'); // ver S17.7
if (!fs.existsSync(dirActas)) { console.error('No hay actas en', dirActas); process.exit(1); }
if (!fs.existsSync(fPartidos)) { console.error('No hay partidos.json en', fPartidos); process.exit(1); }

const partidos = JSON.parse(fs.readFileSync(fPartidos, 'utf8'));
const idsEsperados = new Set(partidos.map(p => String(p.id)));
const ficheros = fs.readdirSync(dirActas).filter(f => f.endsWith('.json'));
const idsPresentes = new Set(ficheros.map(f => f.replace('.json', '')));

// Partidos con cuartos incompletos EN ORIGEN (mismo idiom que excluidos.json):
// el propio PDF de la FEB solo trae menos de 4 cuartos, así que no van a pasar
// nunca por muchas veces que se re-extraigan. Declarados con su motivo y su
// evidencia en cuartos-incompletos-origen.json (S17.6) para que el guardián de
// jugadores no los cuente como fallo cada semana sin dejar de tenerlos en cuenta.
const fIncompletosOrigen = path.join('data', 'processed', compNombre, temp, 'cuartos-incompletos-origen.json');
const idsIncompletosOrigen = new Set(
  (fs.existsSync(fIncompletosOrigen) ? JSON.parse(fs.readFileSync(fIncompletosOrigen, 'utf8')) : [])
    .map(e => String(e.partido))
);

// 1) Cobertura: actas presentes vs partidos esperados
const faltan = [...idsEsperados].filter(id => !idsPresentes.has(id));
const resultadoOficial = new Map(partidos.map(p => [String(p.id), p.resultado]));
const cuartosOficiales = new Map(partidos.map(p => [String(p.id), p.cuartos]));

// 2/3/4) Recorrer actas: contexto, completitud, coherencia
let conContexto = 0, sinContexto = 0, completas = 0, truncadas = 0, rendidas = 0;
let sinJugadores = 0, sinJugadoresSanas = 0, cacheAntigua = 0, incompletosOrigen = 0, minutosRetirados = 0;
let sinTapFcFr = 0; // Q2-4 sin tap/tapRec/fc/fr -- independiente de "cache vieja" (que solo mira `min`)
let puntosNoCuadran = 0, puntosSanos = 0;
let cuartosNoCuadran = 0, cuartosSanos = 0, periodosImposibles = 0, puntosNegativos = 0;
const sinContextoIds = [], truncadasIds = [], rendidasIds = [], sinJugadoresIds = [], puntosNoCuadranIds = [];
const cuartosNoCuadranIds = [], periodosImposiblesIds = [], puntosNegativosIds = [];
// Lista SIN tope (cuartosNoCuadranIds de abajo se corta en 8 para no inundar la
// consola): la politica de re-raspado de mas abajo tiene que intentarlo con
// todos los discrepantes, no solo con los primeros 8.
const cuartosNoCuadranTodos = [];
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
  const actaCompleta = a.completo && a.verificado !== false;
  if (actaCompleta) completas++; else { truncadas++; if (truncadasIds.length < 8) truncadasIds.push(a.partido); }

  // Auditoria de actas truncadas (S17.13, 20/10): cruza los puntos del acta
  // (suma de parciales) contra el resultado OFICIAL de partidos.json. Guardian
  // aparte del invariante de minutos de verificarActa, que no puede ver este
  // bug -- si el corte que queda etiquetado "final" esta truncado, parciales y
  // minutos se truncan juntos y de forma coherente, y el invariante de minutos
  // da verde sobre un partido con una prorroga entera desaparecida (ver
  // 2487440 y 2537028, _informe-auditoria-truncadas.md). Los puntos, en
  // cambio, vienen de una fuente DISTINTA (el resultado que ya trae
  // partidos.json desde el listado de la FEB, no del PDF del acta), asi que
  // una truncacion que pasa inadvertida al invariante de minutos no pasa
  // inadvertida aqui. Solo se exige en actas que el pipeline ya da por
  // COMPLETAS (actaCompleta): una truncada/incompleta en origen ya esta
  // marcada en otro sitio y un desajuste ahi es esperado, no nuevo.
  if (actaCompleta && !idsIncompletosOrigen.has(String(a.partido)) && a.parciales && a.parciales.length) {
    const oficial = resultadoOficial.get(String(a.partido));
    const m = oficial ? /^(\d+)\s*-\s*(\d+)$/.exec(oficial.trim()) : null;
    if (m) {
      const sumaLocal = a.parciales.reduce((acc, q) => acc + (q.local || 0), 0);
      const sumaVisitante = a.parciales.reduce((acc, q) => acc + (q.visitante || 0), 0);
      if (sumaLocal !== Number(m[1]) || sumaVisitante !== Number(m[2])) {
        puntosNoCuadran++;
        if (puntosNoCuadranIds.length < 8) puntosNoCuadranIds.push(`${a.partido} (acta ${sumaLocal}-${sumaVisitante}, oficial ${oficial})`);
      } else {
        puntosSanos++;
      }
    }
  }

  // Cuarto a cuarto, no solo el total (S17.14, 20/10). El total es un
  // invariante CONSERVADO POR CONSTRUCCION: los cuartos salen de restar
  // cortes acumulados, asi que si un corte intermedio falla, la resta
  // reparte mal el dato entre DOS cuartos consecutivos pero la suma
  // telescopica (el total) sigue dando el corte final sano -- comparar el
  // total no puede detectar una frontera mal puesta ni en principio.
  //
  // Y OJO: se compara la suma de puntos de JUGADOR en `porCuarto`, no
  // `a.parciales`. `a.parciales` es una tabla que trae el propio PDF del
  // corte final tal cual, ajena a la resta de cortes -- es inmune a este
  // bug y por eso no sirve para cazarlo. `porCuarto` es el desglose POR
  // JUGADOR que sale de diferenciar cortes consecutivos (difJug), y es lo
  // que la app usa de verdad para pintar el marcador por cuarto (lo suma en
  // el cliente): si el corte de Q1 falla, porCuarto[0] es null y todo lo
  // acumulado hasta Q2 se le atribuye entero a Q2 -- confirmado asi en
  // 2488235 (Q1 null, Q2 suma 28-34 cuando el oficial de Q1+Q2 es 9-14 +
  // 19-20 = 28-34: el Q1 entero esta metido dentro de Q2).
  //
  // SIN el gate de `actaCompleta` a proposito, al reves que el chequeo de
  // arriba: el bug ocurre PRECISAMENTE cuando un corte intermedio es null,
  // que es justo lo que hace que `completo` ya sea false -- si este chequeo
  // exigiera actaCompleta, se saltaria a si mismo en el caso que existe para
  // cazar (visto de verdad: 2488235 tiene completo:false y el chequeo de
  // arriba lo ignora sin querer).
  if (!idsIncompletosOrigen.has(String(a.partido)) && a.porCuarto) {
    const cuartosOf = cuartosOficiales.get(String(a.partido));
    if (Array.isArray(cuartosOf) && cuartosOf.length) {
      const n = Math.min(a.porCuarto.length, cuartosOf.length);
      let difiere = false;
      for (let i = 0; i < n; i++) {
        const cuarto = a.porCuarto[i], of = cuartosOf[i];
        if (!cuarto || !of) continue;
        const sumaLocalQ = ((cuarto[0] && cuarto[0].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
        const sumaVisitanteQ = ((cuarto[1] && cuarto[1].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
        if (sumaLocalQ !== (of.local || 0) || sumaVisitanteQ !== (of.visitante || 0)) { difiere = true; break; }
      }
      if (difiere) {
        cuartosNoCuadran++;
        if (cuartosNoCuadranIds.length < 8) cuartosNoCuadranIds.push(a.partido);
        cuartosNoCuadranTodos.push(String(a.partido));
      } else {
        cuartosSanos++;
      }
    }
  }

  // Invariante barato (S17.14): un periodo 0-0 para los dos equipos es
  // baloncesto imposible, pase lo que pase con el total o con verificarActa.
  // No hace falta ni la segunda fuente para verlo. Sobre `porCuarto` (suma de
  // puntos de jugador), por la misma razon que el chequeo de arriba: un
  // `a.parciales` 0-0 no se ha visto nunca (viene de la tabla del PDF), pero
  // un `porCuarto` que suma 0-0 por un corte perdido si es real. Se comprueba
  // en CUALQUIER acta con porCuarto, no solo las "completas".
  if (a.porCuarto) {
    let yaContado0_0 = false, yaContadoNegativo = false;
    for (let i = 0; i < a.porCuarto.length; i++) {
      const cuarto = a.porCuarto[i];
      if (!cuarto) continue; // null = corte perdido, ya contado en "truncadas"; no es un 0-0 real
      const sumaLocalQ = ((cuarto[0] && cuarto[0].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
      const sumaVisitanteQ = ((cuarto[1] && cuarto[1].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
      if (!yaContado0_0 && sumaLocalQ === 0 && sumaVisitanteQ === 0) {
        periodosImposibles++;
        if (periodosImposiblesIds.length < 8) periodosImposiblesIds.push(`${a.partido} (periodo ${i + 1})`);
        yaContado0_0 = true;
      }
      // Invariante barato aparte (_instrucciones.md 31/10, punto 2): un cuarto
      // con puntos NEGATIVOS es igual de imposible que uno 0-0, y hasta hoy
      // solo no llegaba a produccion porque verificarActa fallaba por minutos
      // en los dos casos vistos (2535735, 2536844) -- una coincidencia, no una
      // proteccion de diseño. Si alguna vez un corte perdido produce un
      // "-43/-60" SIN que verificarActa se queje (minutos podrian cuadrar por
      // casualidad), nada lo pararia sin este chequeo. Bloquea siempre, sin
      // segunda fuente, igual que el de arriba.
      if (!yaContadoNegativo && (sumaLocalQ < 0 || sumaVisitanteQ < 0)) {
        puntosNegativos++;
        if (puntosNegativosIds.length < 8) puntosNegativosIds.push(`${a.partido} (periodo ${i + 1}: ${sumaLocalQ}-${sumaVisitanteQ})`);
        yaContadoNegativo = true;
      }
    }
  }

  // Guardian real (S17.6, reusado): que haya jugadores dentro, no solo que la
  // coleccion exista. Un acta con porCuarto vacio de principio a fin (visto de
  // verdad: 2484716) pasaba conContexto y completo/verificado sin que nadie
  // comprobara que hubiera una sola fila de jugador -- este es el chequeo que
  // faltaba. Solo es FIABLE en actas ya regeneradas con el arreglo que hace que
  // difJug conserve "min" en los cuartos 2-4: en la cache vieja "min" falta ahi
  // y la suma saldria corta por el formato, no por un jugador perdido de
  // verdad, asi que esas se cuentan aparte para no mentir con el numero.
  if (idsIncompletosOrigen.has(String(a.partido))) {
    incompletosOrigen++;
    continue; // declarado en cuartos-incompletos-origen.json: no va a cuadrar nunca, no cuenta como fallo
  }

  // Minutos retirados A PROPOSITO (S17.16 + _instrucciones.md 31/10, lote
  // siguiente, punto 2): una acta con `minutosNoVerifican` no es cache
  // vieja -- es formato nuevo con una columna que nosotros decidimos no
  // ofrecer entera (accion 'vaciado') o con un descuadre que ya aceptamos
  // publicar tal cual (accion 'con_descuadre'). Las dos se cuentan aparte,
  // ANTES del chequeo de `minEnQ2a4` de abajo: ese chequeo mide "falta `min`
  // por formato viejo", y desde que empezamos a borrar `min` a proposito
  // (vaciado) deja de medir eso para estas actas -- contarlas ahi inflaria
  // "cache vieja" sin que sea cache vieja de verdad. Y 'con_descuadre' NO
  // borra `min` pero SI fallaria este guardian con la misma causa que ya
  // conocemos y aceptamos -- volver a marcarla "FALLAN" aqui es ruido, no
  // una alarma nueva.
  const minEnQ2a4 = (a.porCuarto || []).slice(1).every(cuarto =>
    !cuarto || [0, 1].every(ei => !cuarto[ei] || (cuarto[ei].jugadores || []).every(j => 'min' in j)));

  // tap/tapRec/fc/fr en Q2-4 (_instrucciones.md 31/10, lote siguiente, punto
  // 1 y 3): chequeo APARTE de `minEnQ2a4` -- ese solo mira `min` (correcto
  // para su proposito, que es decidir si verificarActa es medible), pero no
  // dice nada sobre estos otros cuatro campos, que tenian su propio bug en
  // difJug (ya corregido en extraer-acta.js) independiente del de `min`. Se
  // cuenta aparte, SIN bloquear ni mezclarse con "cache vieja": es la forma
  // de ver, semana a semana, si la re-extraccion ha llevado estos cuatro
  // campos a su sitio en la temporada viva, sin reextraer el historico.
  if (a.porCuarto && !a.minutosNoVerifican) {
    const camposOk = a.porCuarto.slice(1).every(cuarto =>
      !cuarto || [0, 1].every(ei => !cuarto[ei] ||
        (cuarto[ei].jugadores || []).every(j => ['tap', 'tapRec', 'fc', 'fr'].every(c => c in j))));
    if (!camposOk) sinTapFcFr++;
  }

  if (a.minutosNoVerifican) {
    minutosRetirados++;
  } else if (a.porCuarto && minEnQ2a4) {
    try {
      verificarActa({ parciales: a.parciales, equipos: equiposDesdePorCuarto(a.porCuarto) }, a.partido);
      sinJugadoresSanas++;
    } catch (e) {
      sinJugadores++; if (sinJugadoresIds.length < 8) sinJugadoresIds.push(`${a.partido} (${e.message.split(': ').slice(1).join(': ')})`);
    }
  } else {
    cacheAntigua++;
  }

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

(async () => {

// Politica de discrepancia (S17.14, _instrucciones.md 20/10 punto 2.1): una
// discrepancia cuarto a cuarto contra partidos.json.cuartos NO significa por
// si sola que el acta mienta. `cuartos` es una foto nuestra del HTML,
// raspada una vez, y la FEB corrige marcadores despues -- visto de verdad en
// 2525764 (temporada VIVA): el acta tenia razon, lo desactualizado era
// nuestro propio `cuartos`. "Un acta imposible y dos fuentes que discrepan no
// son el mismo hallazgo. Lo primero se arregla; lo segundo se investiga."
// Asi que antes de bloquear se re-raspa el HTML fresco de cada discrepante:
//   - si el fresco coincide con el acta -> el desactualizado somos nosotros:
//     se actualiza partidos.json.cuartos y no bloquea.
//   - si el fresco TAMBIEN discrepa del acta -> dos fuentes vivas en
//     desacuerdo de verdad, eso si es una alarma.
// El invariante de periodo 0-0 (ya calculado arriba) no entra en esta
// politica a proposito: no necesita segunda fuente, bloquea siempre.
if (cuartosNoCuadranTodos.length) {
  console.log(`\nResolviendo ${cuartosNoCuadranTodos.length} discrepancia(s) cuarto a cuarto contra el HTML en vivo...`);
  let partidosActualizado = false;
  for (const id of cuartosNoCuadranTodos) {
    const p = partidos.find(x => String(x.id) === id);
    let a;
    try { a = JSON.parse(fs.readFileSync(path.join(dirActas, id + '.json'), 'utf8')); } catch (e) { continue; }
    let fresco;
    try {
      fresco = (await scrapePartido(id)).cuartos;
    } catch (e) {
      console.log(`  ⚠ No se pudo re-raspar ${id} (${e.message}); se mantiene como discrepancia.`);
      await new Promise(r => setTimeout(r, CFG.PAUSA_MS));
      continue;
    }
    await new Promise(r => setTimeout(r, CFG.PAUSA_MS));

    const n = Math.min((a.porCuarto || []).length, fresco.length);
    let coincideConActa = n > 0 && a.porCuarto.length === fresco.length;
    for (let i = 0; i < n && coincideConActa; i++) {
      const cuarto = a.porCuarto[i], of = fresco[i];
      if (!cuarto || !of) { coincideConActa = false; break; }
      const sumaLocalQ = ((cuarto[0] && cuarto[0].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
      const sumaVisitanteQ = ((cuarto[1] && cuarto[1].jugadores) || []).reduce((acc, j) => acc + (j.pts || 0), 0);
      if (sumaLocalQ !== (of.local || 0) || sumaVisitanteQ !== (of.visitante || 0)) coincideConActa = false;
    }

    if (coincideConActa && p) {
      console.log(`  ✓ ${id}: el HTML fresco coincide con el acta -- partidos.json.cuartos estaba desactualizado. Actualizado, no bloquea.`);
      p.cuartos = fresco;
      partidosActualizado = true;
      cuartosNoCuadran--; cuartosSanos++;
      const idx = cuartosNoCuadranIds.indexOf(id);
      if (idx >= 0) cuartosNoCuadranIds.splice(idx, 1);
    } else {
      console.log(`  ✗ ${id}: el HTML fresco TAMBIEN discrepa del acta -- dos fuentes vivas en desacuerdo. Bloquea.`);
    }
  }
  if (partidosActualizado) {
    fs.writeFileSync(fPartidos, JSON.stringify(partidos, null, 1));
    console.log(`  partidos.json actualizado con los cuartos recien raspados.`);
  }
}

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
console.log(`Guardian de jugadores (verificarActa, S17.6):`);
console.log(`  Incompletos en origen (declarados, no bloquean): ${incompletosOrigen}${incompletosOrigen ? ' -> ' + [...idsIncompletosOrigen].join(', ') : ''}`);
console.log(`  De cache VIEJA (sin "min" en Q2-4, no medible todavia): ${cacheAntigua}`);
console.log(`  Minutos retirados a proposito (vaciado/con_descuadre, no es cache vieja): ${minutosRetirados}`);
console.log(`  Sin tap/tapRec/fc/fr en Q2-4 (bug de difJug ya corregido, mide si la re-extraccion ya llego): ${sinTapFcFr}`);
console.log(`  Medibles con el guardian:            ${sinJugadores + sinJugadoresSanas}`);
console.log(`    Sanas:                             ${sinJugadoresSanas}`);
console.log(`    FALLAN (min descuadrado o sin fila): ${sinJugadores}${sinJugadores ? ' -> ' + sinJugadoresIds.join('; ') : ''}`);
console.log('');
console.log(`Auditoria de puntos vs resultado oficial (S17.13):`);
console.log(`  Comprobadas (completas, no declaradas incompletas en origen): ${puntosSanos + puntosNoCuadran}`);
console.log(`  Cuadran:                             ${puntosSanos}`);
console.log(`  NO CUADRAN con partidos.json:        ${puntosNoCuadran}${puntosNoCuadran ? ' -> ' + puntosNoCuadranIds.join('; ') : ''}`);
console.log(`  Cuarto a cuarto, comprobadas:        ${cuartosSanos + cuartosNoCuadran}`);
console.log(`  Cuadran:                             ${cuartosSanos}`);
console.log(`  NO CUADRAN cuarto a cuarto:           ${cuartosNoCuadran}${cuartosNoCuadran ? ' -> ' + cuartosNoCuadranIds.join(', ') : ''}`);
console.log(`  Periodos 0-0 (baloncesto imposible):  ${periodosImposibles}${periodosImposibles ? ' -> ' + periodosImposiblesIds.join('; ') : ''}`);
console.log(`  Periodos con puntos negativos (imposible): ${puntosNegativos}${puntosNegativos ? ' -> ' + puntosNegativosIds.join('; ') : ''}`);
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
// Bloquea (28/9/2026, S17.6): un acta con jugadores perdidos o minutos que no
// cuadran no debe entrar en agregados. Antes de encenderlo se midio que solo 3
// de 2537 actas eran medibles con este chequeo y las 3 eran fallos ya conocidos
// -- cero falsos positivos -- y las que nunca van a cuadrar (origen truncado)
// se declaran en cuartos-incompletos-origen.json para no bloquear para siempre.
if (sinJugadores > 0) problemas.push(`${sinJugadores} actas con jugadores perdidos o minutos descuadrados`);
// Bloquea (20/10/2026, S17.13): una acta "completa" cuyos puntos no cuadran
// con el resultado oficial esta MINTIENDO, no solo incompleta -- verificarActa
// ya le dio el visto bueno (ver cabecera del chequeo de arriba), asi que nada
// mas la para antes de entrar en agregados. Mejor un acta que falta (el
// guardian de huecos de resumen-salud.js la ve) que un acta que miente (no la
// ve nadie).
if (puntosNoCuadran > 0) problemas.push(`${puntosNoCuadran} actas completas cuyos puntos no cuadran con el resultado oficial`);
// Bloquea (20/10/2026, S17.14): el total puede cuadrar por construccion
// aunque una frontera entre cuartos este mal puesta (ver cabecera del
// chequeo de arriba) -- asi que esto bloquea aparte, con su propio mensaje,
// no fundido con el de arriba: son dos formas distintas de que un acta
// mienta, con dos causas distintas que arreglar.
if (cuartosNoCuadran > 0) problemas.push(`${cuartosNoCuadran} actas cuyo reparto cuarto a cuarto no cuadra con partidos.json (el total si cuadra)`);
if (periodosImposibles > 0) problemas.push(`${periodosImposibles} actas con un periodo 0-0 para los dos equipos (imposible)`);
if (puntosNegativos > 0) problemas.push(`${puntosNegativos} actas con un periodo de puntos negativos (imposible)`);

if (problemas.length === 0) {
  console.log('VEREDICTO: LISTO para generar agregados y boxscore.');
  console.log(`(${faltan.length} partidos sin acta, ${truncadas} truncados y ${rendidas} rendidos son normales; la app los maneja.)`);
} else {
  console.log('VEREDICTO: NO generar todavia. Problemas: ' + problemas.join('; ') + '.');
  if (sinContexto > 0) console.log('  -> Borra las actas sin contexto y re-extrae (sin --forzar) antes de generar.');
  if (sinJugadores > 0) console.log('  -> Re-extrae (sin --forzar) ' + sinJugadoresIds.map(s => s.split(' ')[0]).join(', ') + '; si vuelve a fallar, declaralo en cuartos-incompletos-origen.json.');
  if (puntosNoCuadran > 0) console.log('  -> Re-extrae (sin --forzar) ' + puntosNoCuadranIds.map(s => s.split(' ')[0]).join(', ') + '; si vuelve a fallar, investigar a mano (no declarar en cuartos-incompletos-origen.json sin mirar antes: un acta que miente no es lo mismo que una truncada en origen).');
  if (cuartosNoCuadran > 0 || periodosImposibles > 0 || puntosNegativos > 0) console.log('  -> Re-extrae (sin --forzar) ' + [...new Set([...cuartosNoCuadranIds, ...periodosImposiblesIds.map(s => s.split(' ')[0]), ...puntosNegativosIds.map(s => s.split(' ')[0])])].join(', ') + '; si se concentra en un grupo, busca la causa antes de re-extraer uno a uno.');
}
console.log('');
// Codigo de salida: 1 si hay problemas (util en CI para que el paso quede marcado)
process.exit(problemas.length ? 1 : 0);

})().catch(err => { console.error('Error al verificar cuartos:', err.message); process.exit(1); });
