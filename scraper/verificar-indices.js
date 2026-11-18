// Partidos con resultado en el indice y sin fichero de partido (lote 38).
//
// scrape.js apunta cada partido en _indice.json y, si scrapePartido falla, no
// escribe su fichero; calcular.js solo lee ficheros, asi que el partido
// desaparece de la clasificacion y de todo lo derivado sin que nada lo cuente.
// En la temporada en curso el run siguiente lo reintenta solo; en una cerrada
// no se vuelve a raspar nunca. Asi faltaron tres partidos desde julio
// (Segunda 2023 2345131, Tercera 2024 2417818 y 2415142) hasta el 17/11.
//
// Uso: node scraper/verificar-indices.js     (sale con 1 si hay huecos en
//      temporadas cerradas; los de la temporada en curso solo se listan)
const fs = require('fs');
const path = require('path');
const CFG = require('./config');

function huecosDeIndices() {
  const estado = (() => { try { return JSON.parse(fs.readFileSync(path.join('data', 'processed', 'estado.json'), 'utf8')); } catch (e) { return { competiciones: {} }; } })();
  const huecos = [];
  for (const comp of Object.values(CFG.COMPETICIONES)) {
    const dirComp = path.join('data', 'raw', comp);
    if (!fs.existsSync(dirComp)) continue;
    const enCurso = estado.competiciones?.[comp]?.temporada;
    for (const temp of fs.readdirSync(dirComp).filter(t => /^\d{4}$/.test(t))) {
      const dirTemp = path.join(dirComp, temp);
      for (const grupo of fs.readdirSync(dirTemp)) {
        if (grupo === 'actas' || grupo.startsWith('_')) continue;
        const fIndice = path.join(dirTemp, grupo, '_indice.json');
        if (!fs.existsSync(fIndice)) continue;
        for (const p of JSON.parse(fs.readFileSync(fIndice, 'utf8'))) {
          if (/\d+\s*-\s*\d+/.test(p.resultado || '') && !fs.existsSync(path.join(dirTemp, grupo, `${p.id}.json`)))
            huecos.push({ comp, temp, grupo, id: String(p.id), jornada: p.jornada, resultado: p.resultado, cerrada: temp !== enCurso });
        }
      }
    }
  }
  return huecos;
}

if (require.main === module) {
  const huecos = huecosDeIndices();
  for (const h of huecos) console.log(`${h.cerrada ? '❌' : '⚠'} ${h.comp} ${h.temp} ${h.grupo}: ${h.id} (${h.jornada}, ${h.resultado})${h.cerrada ? ' -- temporada cerrada, no se reintenta sola' : ''}`);
  console.log(`Partidos en el indice con resultado y sin fichero: ${huecos.length} (${huecos.filter(h => h.cerrada).length} en temporadas cerradas)`);
  process.exit(huecos.some(h => h.cerrada) ? 1 : 0);
}

module.exports = { huecosDeIndices };
