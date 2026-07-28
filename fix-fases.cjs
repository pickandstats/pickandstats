const fs = require('fs');

// --- 1. FasesAscenso: pasar el objeto completo, como hace PlayOff ---
const ff = 'src/FasesAscenso.jsx';
let a = fs.readFileSync(ff, 'utf8');
const viejo = '        onClick={() => jugado && onVerPartido(p.id)}>';
if (!a.includes(viejo)) { console.log('No encuentro el onClick de FasesAscenso'); process.exit(1); }
const nuevo = `        onClick={() => jugado && onVerPartido({
          ...p, grupo: 'Fases de ascenso',
          local: { id: null, nombre: p.local },
          visitante: { id: null, nombre: p.visitante },
          cuartos: p.cuartos || []
        })}>`;
a = a.replace(viejo, nuevo);
fs.writeFileSync(ff, a);
console.log('FasesAscenso.jsx: pasa el objeto del partido, no el id');

// --- 2. verPartido: quitar el log y avisar si un id no se encuentra ---
const fa = 'src/App.jsx';
let s = fs.readFileSync(fa, 'utf8');
s = s.replace("\n    console.log('[verPartido] recibido:', arg, '| typeof:', typeof arg);", '');
const cierre = `    const p = (arg && typeof arg === 'object') ? arg : partidos.find(x => x.id === arg);
    if (p) { setPartidoSel(p); setEquipoSel(null); setJugadorSel(null); window.scrollTo(0, 0); }`;
if (s.includes(cierre)) {
  s = s.replace(cierre, `    const p = (arg && typeof arg === 'object') ? arg : partidos.find(x => x.id === arg);
    if (p) { setPartidoSel(p); setEquipoSel(null); setJugadorSel(null); window.scrollTo(0, 0); }
    else console.warn('verPartido: no encuentro el partido', arg);`);
  console.log('App.jsx: log temporal quitado y aviso si no encuentra el partido');
}
fs.writeFileSync(fa, s);
