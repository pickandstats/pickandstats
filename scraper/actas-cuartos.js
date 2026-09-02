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
const rutaPartidos = path.join('web', 'public', 'data', compNombre, temp, nombreFuente);
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

(async () => {
  let procesados = 0, saltados = 0, errores = 0, reparadas = 0;
  const rotaIds = new Set();   // actas presentes en disco que NO estan sanas
  const rendidasIds = [];      // rotas que ya agotaron los intentos: no se reintentan
  const erroresIds = [];       // la extraccion fallo (red, PDF inaccesible)
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
      } else {
        // Quedo sana: sin campo intentos (el fichero queda limpio).
        rotaIds.delete(String(p.id));
        if (previa && !esSana(previa)) reparadas++;
      }
      fs.writeFileSync(destino, JSON.stringify(salida, null, 1));
      procesados++;
      const marca = !sana ? ' ⚠' : '';
      process.stdout.write(`\r  ${procesados} procesados, ${saltados} saltados${marca}   `);
    } catch (e) {
      // Fallo de extraccion (red, PDF inaccesible). NO consume intento: solo se
      // anota fallosRed en el acta previa (si la hay) para poder informar luego.
      errores++;
      erroresIds.push(`${p.id}: ${e.message}`);
      if (previa && !previa._corrupta) {
        previa.fallosRed = (previa.fallosRed || 0) + 1;
        try { fs.writeFileSync(destino, JSON.stringify(previa, null, 1)); } catch (_) {}
      }
    }
  }

  // Resumen: cuenta lo que hay EN DISCO, no solo lo tocado en esta ejecucion.
  const rotas = [...rotaIds];
  console.log(`\n\nHecho: ${procesados} escritas` +
    (reparadas ? ` (${reparadas} reparadas)` : '') +
    `, ${saltados} sanas sin tocar, ${errores} errores de extraccion`);
  console.log(`Actas rotas en disco: ${rotas.length}` + (rotas.length ? ' -> ' + rotas.join(', ') : ''));
  if (rendidasIds.length)
    console.log(`Rendidas (>=${LIMITE_INTENTOS} intentos, no se reintentan): ${rendidasIds.length} -> ${rendidasIds.join(', ')}`);
  if (erroresIds.length) { console.log('\nErrores de extraccion (se reintentaran):'); erroresIds.forEach(x => console.log('  ' + x)); }

  // Codigo de salida honesto (S17.3): solo se falla si el fallo es SISTEMICO
  // —hubo errores y no se escribio nada—, senal de que la FEB no responde o algo
  // se rompio. Errores sueltos con extracciones que si funcionaron no fallan: son
  // el goteo normal de PDF caidos, que se reintentan la semana siguiente.
  if (errores > 0 && procesados === 0) {
    console.error(`\n❌ Fallo sistemico: ${errores} errores y 0 actas escritas. Revisa la conexion o si la FEB cambio las actas.`);
    process.exit(1);
  }
})().catch(err => { console.error('Error inesperado en actas-cuartos:', err.message); process.exit(1); });
