// Extrae el rendimiento por cuarto de cada jugador (desde las actas publicas en PDF)
// para todos los partidos jugados de una competicion/temporada, y lo guarda como
// un fichero por partido en data/raw/<comp>/<temp>/actas/<id>.json
//
// Incremental: salta un partido solo si su acta ya guardada esta SANA (completa,
// verificada y con contexto por cuarto). Las actas rotas se reintentan hasta 4
// veces (campo "intentos" en el propio fichero); pasado ese limite se rinden,
// porque hay actas que la FEB nunca completara. Un fallo de red/PDF NO consume
// intento (solo anota "fallosRed"): rendirse por un fallo transitorio dejaria un
// agujero permanente en los datos, mientras que reintentarlo cuesta una peticion.
//
// Uso:
//   node scraper/actas-cuartos.js --competicion 1 --temporada 2025
//   node scraper/actas-cuartos.js --competicion 1 --temporada 2025 --limite 5
const fs = require('fs');
const path = require('path');
const { extraerActaPorCuartos } = require('./extraer-acta');
const CFG = require('./config');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };

const comp = val('--competicion') || '1';
const temp = val('--temporada') || '2025';
const forzar = args.includes('--forzar'); // re-extrae aunque el fichero ya exista
const soloFases = args.includes('--fases'); // extrae las actas de fases (playoffs, ascensos) en vez de la liga regular
const limite = val('--limite') ? parseInt(val('--limite'), 10) : null;
const compNombre = COMPS[comp];
if (!compNombre) { console.error('Competicion no valida:', comp); process.exit(1); }

// Fuente de la lista de partidos: partidos.json (liga regular) o fases.json (--fases)
const nombreFuente = soloFases ? 'fases.json' : 'partidos.json';
// data/processed, NO web/public/data (S17.7): ese espejo solo se refresca
// con un deploy que salga bien, y generar cuartos es precisamente lo que un
// deploy necesita para poder salir bien -- leer de ahi cierra un
// interbloqueo. data/processed lo acaba de escribir calcular.js en esta
// misma ejecucion, siempre al dia.
const rutaPartidos = path.join('data', 'processed', compNombre, temp, nombreFuente);
if (!fs.existsSync(rutaPartidos)) { console.error('No existe', rutaPartidos); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(rutaPartidos, 'utf8'));
let arr;
if (soloFases) {
  // fases.json: array de fases, cada una con partidos[] anidados
  arr = [];
  (Array.isArray(raw) ? raw : []).forEach(fase => (fase.partidos || []).forEach(p => arr.push(p)));
} else {
  arr = Array.isArray(raw) ? raw : (raw.partidos || Object.values(raw)[0]);
}
const jugados = arr.filter(p => p.resultado && /\d+-\d+/.test(p.resultado));

const dirActas = path.join('data', 'raw', compNombre, temp, 'actas');
fs.mkdirSync(dirActas, { recursive: true });

// Un acta esta "sana" si esta completa, cuadra la verificacion y trae contexto
// por cuarto. Es la MISMA condicion que usa el verificador para dar por buena un
// acta; solo las sanas se saltan por existir.
const esSana = a => !!(a && a.completo && a.verificado !== false && a.contextoPorCuarto);
const LIMITE_INTENTOS = 4;

// Politica de reintento para actas que SI descargamos pero no verifican
// (_instrucciones.md 31/10, punto 4). Sin esto, cada run semanal volvia a
// pedir 4-8 PDFs a la FEB por cada una de estas actas, para siempre -- no
// hay campo "intentos" en disco que las frene (nunca se escribe nada en
// data/raw para ellas, ver registro de arriba). Tras UMBRAL_CONOCIDA intentos
// fallidos se consideran persistentes y pasan a reintentarse solo cada
// RETRY_DIAS_CONOCIDA dias, no cada run. NO toca DIAS_ACTA/DIAS_ACTA_TOPE de
// resumen-salud.js a proposito: ese suelo existe para decir cuando una acta
// que falta es sospechosa, y esta politica es sobre CUANTO GASTAMOS
// reintentando, no sobre cuando avisar -- la entrada del registro sigue
// contando como fallo en resumen-salud.js este run la toque o no.
const UMBRAL_CONOCIDA = 2;
const RETRY_DIAS_CONOCIDA = 14;

// Version de la regla que produce `verificado` (_instrucciones.md 20/10, punto 1.3).
// Subela cuando cambie que comprueba `cuadra` de abajo -- quien lee `verificado`
// (boxscore-cuartos.js) compara esta version contra la que tiene guardada el acta, y
// si no coincide (o no hay ninguna, actas de antes de que esto existiera) no se fia
// del veredicto cacheado. Un veredicto sin la version de su regla es indistinguible
// de un veredicto al dia -- este campo es lo que los distingue.
const VERSION_VERIFICACION = 1;

// Registro de actas que SI descargamos y parseamos pero no pasan verificarActa
// (_instrucciones.md 31/10, punto 1). Antes este caso no escribia nada -- ni en
// data/raw ni en ningun lado -- y aguas abajo (resumen-salud.js) era
// indistinguible de "la FEB no ha publicado el acta todavia": las dos se ven
// igual, un fichero que no existe. Pero son dos problemas distintos (uno se
// arregla solo con tiempo, el otro no), y uno de los dos tiene evidencia que
// vale la pena guardar: lado que falla, minutos obtenidos/esperados, filas de
// jugador por equipo, http y bytes de la descarga que SI funciono.
//
// Generado, nunca a mano, y AUTOLIMPIABLE como cuartos-incompletos-origen.json:
// solo se toca la entrada de un partido cuando este run lo intenta de verdad
// (si --limite deja fuera a un partido, su entrada previa se conserva tal
// cual). Si el intento de este run pasa verificarActa, la entrada se borra
// sola -- no hace falta una reparacion aparte para sacarlo del registro.
const fRegistroSinVerificar = path.join('data', 'processed', compNombre, temp, 'actas-no-verificadas.json');
const registroSinVerificar = new Map();
try {
  const previoReg = JSON.parse(fs.readFileSync(fRegistroSinVerificar, 'utf8'));
  (Array.isArray(previoReg) ? previoReg : []).forEach(e => registroSinVerificar.set(String(e.partido), e));
} catch (e) { /* no existe todavia o es ilegible: arranca vacio */ }

(async () => {
  let procesados = 0, saltados = 0, errores = 0, reparadas = 0;
  const rotaIds = new Set();   // actas presentes en disco que NO estan sanas
  const rendidasIds = [];      // rotas que ya agotaron los intentos: no se reintentan
  const nuevasRendidasIds = []; // actas que cruzan a rendida (>=LIMITE) EN ESTA ejecucion
  const erroresIds = [];       // la extraccion fallo (red, PDF inaccesible)
  const sinVerificarIds = [];  // la extraccion SI funciono, pero no pasa verificarActa (ver registro)
  const saltadasConocidasIds = []; // conocidas y recientes: no se reintentan este run (ver politica arriba)
  const total = limite ? Math.min(limite, jugados.length) : jugados.length;
  console.log(`${compNombre} ${temp}: ${jugados.length} partidos jugados` +
    (limite ? ` (procesando ${total})` : '') + `\n`);

  for (let i = 0; i < jugados.length; i++) {
    if (limite && procesados + saltados >= limite) break;
    const p = jugados[i];
    const destino = path.join(dirActas, p.id + '.json');

    let previa = null, intentosPrevios = 0;
    if (!forzar && fs.existsSync(destino)) {
      try { previa = JSON.parse(fs.readFileSync(destino, 'utf8')); }
      catch (e) { previa = { _corrupta: true }; }   // ilegible: tratar como rota
      if (esSana(previa)) { saltados++; continue; }
      // Rota: cuenta como aviso en disco y, si agoto los intentos, se rinde.
      rotaIds.add(String(p.id));
      intentosPrevios = previa._corrupta ? 0 : (previa.intentos || 0);
      if (intentosPrevios >= LIMITE_INTENTOS) { rendidasIds.push(p.id); continue; }
      // si no, cae a la re-extraccion de abajo
    }

    // Conocida y reciente (ver politica de reintento arriba): no se reintenta
    // este run. Nunca hay fichero en disco para estas (no escriben nada, ver
    // catch de abajo), asi que este chequeo es aparte del de "previa" de
    // arriba, no una rama de el.
    if (!forzar) {
      const reg = registroSinVerificar.get(String(p.id));
      if (reg && (reg.intentos || 0) >= UMBRAL_CONOCIDA) {
        const diasDesde = (Date.now() - new Date(reg.ultimoIntento || reg.generado).getTime()) / 86400000;
        if (diasDesde < RETRY_DIAS_CONOCIDA) { saltadasConocidasIds.push(p.id); continue; }
      }
    }

    try {
      const acta = await extraerActaPorCuartos(p.id);
      // Verificacion: suma de cuartos == total de cada jugador
      let cuadra = true;
      acta.final.equipos.forEach((eq, ei) => {
        eq.jugadores.forEach(jf => {
          const suma = acta.porCuarto.reduce((acc, c) => {
            if (!c) return acc;
            const j = c[ei].jugadores.find(x => x.dorsal === jf.dorsal);
            return acc + (j ? j.pts : 0);
          }, 0);
          if (suma !== jf.pts) cuadra = false;
        });
      });

      const salida = {
        partido: p.id,
        competicion: comp, temporada: temp,
        local: acta.final.nombreLocal, visitante: acta.final.nombreVisitante,
        marcador: acta.final.marcador,
        parciales: acta.final.parciales,
        contexto: acta.final.contexto,
        nCuartos: acta.cortes.length,
        completo: acta.completo,
        verificado: cuadra,
        verificadoCon: VERSION_VERIFICACION,
        porCuarto: acta.porCuarto,   // [cuarto][equipo].jugadores[]
        contextoPorCuarto: acta.contextoPorCuarto, // [cuarto] contraataque, pintura, 2a op, tras perdida, banquillo
        generado: new Date().toISOString().slice(0, 10),
      };

      const sana = esSana(salida);
      if (!sana) {
        // Sigue rota tras extraerla bien: consume un intento. Al llegar al limite
        // dejara de reintentarse en semanas futuras.
        salida.intentos = intentosPrevios + 1;
        rotaIds.add(String(p.id));
        if (salida.intentos >= LIMITE_INTENTOS) nuevasRendidasIds.push(p.id); // cruza a rendida ahora
      } else {
        // Quedo sana: sin campo intentos (el fichero queda limpio).
        rotaIds.delete(String(p.id));
        if (previa && !esSana(previa)) reparadas++;
      }
      fs.writeFileSync(destino, JSON.stringify(salida, null, 1));
      procesados++;
      // Paso verificarActa de verdad: si estaba en el registro de no
      // verificadas de una semana anterior, se autolimpia sola.
      registroSinVerificar.delete(String(p.id));
      const marca = !sana ? ' ⚠' : '';
      process.stdout.write(`\r  ${procesados} procesados, ${saltados} saltados${marca}   `);
    } catch (e) {
      errores++;
      erroresIds.push(`${p.id}: ${e.message}`);
      if (e.tipoFallo === 'verificacion') {
        // El PDF se descargo y se parseo -- esto NO es "la FEB no lo ha
        // publicado todavia" (ese es el caso de abajo, sin e.tipoFallo).
        // Se registra con evidencia, no solo con el mensaje: resumen-salud.js
        // necesita poder contar esto aparte (ver cabecera del registro).
        // `intentos`/`ultimoIntento` alimentan la politica de reintento de
        // arriba; `generado` es la primera vez que entro, se conserva.
        sinVerificarIds.push(p.id);
        const previoEnReg = registroSinVerificar.get(String(p.id));
        registroSinVerificar.set(String(p.id), {
          partido: p.id, competicion: comp,
          ...e.evidencia,
          mensaje: e.message,
          intentos: (previoEnReg && previoEnReg.intentos || 0) + 1,
          generado: (previoEnReg && previoEnReg.generado) || new Date().toISOString().slice(0, 10),
          ultimoIntento: new Date().toISOString().slice(0, 10),
        });
      } else if (previa && !previa._corrupta) {
        // Fallo de extraccion (red, PDF inaccesible). NO consume intento: solo
        // se anota fallosRed en el acta previa (si la hay) para poder
        // informar luego.
        previa.fallosRed = (previa.fallosRed || 0) + 1;
        try { fs.writeFileSync(destino, JSON.stringify(previa, null, 1)); } catch (_) {}
      }
    }
  }

  // Registro de actas-no-verificadas.json: se reescribe siempre (incluso
  // vacio), igual que cuartos-cobertura.json -- la base tiene que avanzar
  // sola, autolimpiandose, no solo crecer.
  try {
    fs.mkdirSync(path.dirname(fRegistroSinVerificar), { recursive: true });
    fs.writeFileSync(fRegistroSinVerificar,
      JSON.stringify([...registroSinVerificar.values()].sort((a, b) => String(a.partido).localeCompare(String(b.partido))), null, 1));
  } catch (e) { console.log('  ⚠ no se pudo escribir el registro de actas sin verificar: ' + e.message); }

  // Resumen: cuenta lo que hay EN DISCO, no solo lo tocado en esta ejecucion.
  const rotas = [...rotaIds];
  console.log(`\n\nHecho: ${procesados} escritas` +
    (reparadas ? ` (${reparadas} reparadas)` : '') +
    `, ${saltados} sanas sin tocar, ${errores} errores de extraccion` +
    (sinVerificarIds.length ? ` (${sinVerificarIds.length} de ellos no verifican, no son fallo de red -- ver registro)` : ''));
  console.log(`Actas rotas en disco: ${rotas.length}` + (rotas.length ? ' -> ' + rotas.join(', ') : ''));
  if (saltadasConocidasIds.length)
    console.log(`Conocidas y recientes (no se reintentan, cadencia >${RETRY_DIAS_CONOCIDA}d): ${saltadasConocidasIds.length} -> ${saltadasConocidasIds.join(', ')}`);
  if (rendidasIds.length)
    console.log(`Rendidas (>=${LIMITE_INTENTOS} intentos, no se reintentan): ${rendidasIds.length} -> ${rendidasIds.join(', ')}`);
  if (erroresIds.length) { console.log('\nErrores de extraccion (se reintentaran):'); erroresIds.forEach(x => console.log('  ' + x)); }
  if (sinVerificarIds.length)
    console.log(`\nDe esos, ${sinVerificarIds.length} SI descargaron y parsearon pero no pasan verificarActa ` +
      `(evidencia en ${fRegistroSinVerificar}): ${sinVerificarIds.join(', ')}`);

  // Reporte de esta ejecucion para el resumen de salud (S17.5.4). Gitignored:
  // es estado efimero del run, no producto. Solo lo actionable: las actas que
  // acaban de quedar permanentemente incompletas y los errores de extraccion.
  try {
    const fReporte = path.join('data', 'processed', 'cuartos-run-' + comp + '.json');
    fs.mkdirSync(path.dirname(fReporte), { recursive: true });
    fs.writeFileSync(fReporte, JSON.stringify({
      competicion: comp, temporada: temp, generado: new Date().toISOString(),
      nuevasRendidas: nuevasRendidasIds, errores: erroresIds,
    }, null, 1));
  } catch (e) { console.log('  ⚠ no se pudo escribir el reporte de ejecucion: ' + e.message); }

  // Codigo de salida honesto (S17.3): solo se falla si el fallo es SISTEMICO
  // —hubo errores y no se escribio nada—, senal de que la FEB no responde o algo
  // se rompio. Errores sueltos con extracciones que si funcionaron no fallan: son
  // el goteo normal de PDF caidos, que se reintentan la semana siguiente.
  if (errores > 0 && procesados === 0) {
    console.error(`\n❌ Fallo sistemico: ${errores} errores y 0 actas escritas. Revisa la conexion o si la FEB cambio las actas.`);
    process.exit(1);
  }
})().catch(err => { console.error('Error inesperado en actas-cuartos:', err.message); process.exit(1); });
