const fs = require('fs');
const f = 'src/content/guias/equipos-segunda-feb-2026-27.md';
let s = fs.readFileSync(f, 'utf8');

s = s.replace('| Movistar Estudiantes | Campeón de la Fase Final B3 | A |',
              '| Movistar Estudiantes B | Campeón de la Fase Final B3 | A |');

const ancla = 'Cinco de los seis han quedado encuadrados en el Grupo A; solo el Prat va al B.';
const extra = ancla + `

Dos apuntes que conviene no confundir. El que asciende es el **filial** del
Movistar Estudiantes: el primer equipo juega en Primera FEB, así que en Segunda se
inscribe con la "B".

Y en Jaén se cruzan dos clubes distintos que comparten patrocinador. El **Jaén
Paraíso Interior FS** sube desde la Tercera FEB como campeón de su fase final,
mientras que el **Jaén Paraíso Interior CB** hizo el camino contrario: perdió la
eliminatoria de permanencia por tres puntos en el global, pese a haber ganado el
partido de ida, y bajó a Tercera. Se cruzan en direcciones opuestas la misma
temporada.`;

if (!s.includes(ancla)) { console.log('No encuentro el anclaje'); process.exit(1); }
s = s.replace(ancla, extra);
fs.writeFileSync(f, s);
console.log('Guía de Segunda: corregido Estudiantes B y añadido el cruce de los dos Jaén');
