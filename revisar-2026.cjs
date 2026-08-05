const fs = require('fs'), p = require('path');
for (const comp of ['primerafeb', 'segundafeb', 'tercerafeb']) {
  const base = p.join('data', 'raw', comp, '2026');
  if (!fs.existsSync(base)) { console.log(comp + ': sin datos'); continue; }
  let total = 0, conHora = 0;
  const detalle = [];
  for (const g of fs.readdirSync(base)) {
    const f = p.join(base, g, '_indice.json');
    if (!fs.existsSync(f)) continue;
    const i = JSON.parse(fs.readFileSync(f, 'utf8'));
    const jorn = new Set(i.map(x => +(x.jornada.match(/\d+/) || [0])[0]));
    total += i.length; conHora += i.filter(x => x.hora).length;
    detalle.push(`${g}: ${i.length}p / ${jorn.size}j`);
  }
  console.log(`${comp}: ${total} partidos (${conHora} con hora)`);
  console.log('   ' + detalle.join(' · '));
}
