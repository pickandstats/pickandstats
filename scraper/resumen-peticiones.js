// Resumen de las peticiones contadas por contar-peticiones.js en esta
// ejecucion: por script, por host, y el total contra la FEB. Se imprime y, si
// hay panel de GitHub Actions, se anade al resumen del job.
// Uso: PETICIONES_LOG=/tmp/peticiones.jsonl node scraper/resumen-peticiones.js
const fs = require('fs');
const f = process.env.PETICIONES_LOG;
if (!f || !fs.existsSync(f)) { console.log('Sin registro de peticiones (PETICIONES_LOG vacio o inexistente).'); process.exit(0); }
const filas = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const porScript = {};
let feb = 0, total = 0;
for (const r of filas) {
  const k = r.script + (r.args ? ' ' + r.args.replace(/--temporada \d+/, '').trim() : '');
  porScript[k] = (porScript[k] || 0) + r.n;
  total += r.n;
  for (const [h, c] of Object.entries(r.porHost || {})) if (/feb\.es$/.test(h)) feb += c;
}
const lineas = Object.entries(porScript).sort((a, b) => b[1] - a[1]);
const txt = [`Peticiones HTTP de esta ejecucion: ${total} (a baloncestoenvivo.feb.es: ${feb})`, ...lineas.map(([k, n]) => `  ${String(n).padStart(6)}  ${k}`)];
console.log(txt.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n### Peticiones a la FEB\n\n```\n' + txt.join('\n') + '\n```\n'); } catch (_) {}
}
