// Extrae el rendimiento por cuarto de cada jugador (desde las actas publicas en PDF)
// para todos los partidos jugados de una competicion/temporada, y lo guarda como
// un fichero por partido en data/raw/<comp>/<temp>/actas/<id>.json
//
// Incremental e idempotente: salta los partidos que ya tienen fichero.
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
const limite = val('--limite') ? parseInt(val('--limite'), 10) : null;
const compNombre = COMPS[comp];
if (!compNombre) { console.error('Competicion no valida:', comp); process.exit(1); }

// Fuente de la lista de partidos: partidos.json ya procesado
const rutaPartidos = path.join('web', 'public', 'data', compNombre, temp, 'partidos.json');
if (!fs.existsSync(rutaPartidos)) { console.error('No existe', rutaPartidos); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(rutaPartidos, 'utf8'));
const arr = Array.isArray(raw) ? raw : (raw.partidos || Object.values(raw)[0]);
const jugados = arr.filter(p => p.resultado && /\d+-\d+/.test(p.resultado));

const dirActas = path.join('data', 'raw', compNombre, temp, 'actas');
fs.mkdirSync(dirActas, { recursive: true });

(async () => {
  let procesados = 0, saltados = 0, errores = 0, incompletos = 0;
  const problemas = [];
  const total = limite ? Math.min(limite, jugados.length) : jugados.length;
  console.log(`${compNombre} ${temp}: ${jugados.length} partidos jugados` +
    (limite ? ` (procesando ${total})` : '') + `\n`);

  for (let i = 0; i < jugados.length; i++) {
    if (limite && procesados + saltados >= limite) break;
    const p = jugados[i];
    const destino = path.join(dirActas, p.id + '.json');
    if (!forzar && fs.existsSync(destino)) { saltados++; continue; }

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
      fs.writeFileSync(destino, JSON.stringify(salida, null, 1));
      procesados++;
      if (!acta.completo || !cuadra) { incompletos++; problemas.push(`${p.id} (completo:${acta.completo} verificado:${cuadra})`); }
      const marca = (!acta.completo || !cuadra) ? ' ⚠' : '';
      process.stdout.write(`\r  ${procesados} procesados, ${saltados} saltados${marca}   `);
    } catch (e) {
      errores++;
      problemas.push(`${p.id} ERROR: ${e.message}`);
    }
  }

  console.log(`\n\nHecho: ${procesados} nuevos, ${saltados} ya existian, ${errores} errores, ${incompletos} con avisos`);
  if (problemas.length) { console.log('\nPartidos con incidencias:'); problemas.forEach(p => console.log('  ' + p)); }
})();
