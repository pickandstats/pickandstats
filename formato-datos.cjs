const fs = require('fs');
const f = 'web/src/Equipo.jsx';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('leyenda-colores')) { console.log('Ya estaba'); process.exit(0); }

// 1. Umbral por desviación típica: destaca solo lo realmente distinto
const viejo = `      const m = mediaDe(clave);
      if (m !== null) {
        const dif = Math.abs(+v - m) / (Math.abs(m) || 1);
        if (dif > 0.02) clase = (MENOS_MEJOR.has(clave) ? +v < m : +v > m) ? 'val-bien' : 'val-mal';
      }`;
const nuevo = `      const vals = delGrupo.map(e => +e[clave]).filter(x => Number.isFinite(x));
      const m = mediaDe(clave);
      if (m !== null && vals.length > 2) {
        // Destacar solo lo que se aparta media desviación típica de la media del grupo:
        // con un umbral menor, en un equipo dominante todo sale del mismo color.
        const dt = Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
        if (dt > 0 && Math.abs(+v - m) >= dt * 0.5)
          clase = (MENOS_MEJOR.has(clave) ? +v < m : +v > m) ? 'val-bien' : 'val-mal';
      }`;
if (!s.includes(viejo)) { console.log('No encuentro el cálculo del color'); process.exit(1); }
s = s.replace(viejo, nuevo);

// 2. Leyenda al pie del bloque de datos
const cierre = '        </div>\n        </>\n      ) : vistaFicha === \'dossier\' ? (';
if (!s.includes(cierre)) { console.log('No encuentro el cierre'); process.exit(1); }
s = s.replace(cierre,
`        <p className="leyenda-colores">
          <span className="val-bien">Verde</span> y <span className="val-mal">rojo</span> señalan
          los valores que se apartan claramente de la media del grupo {equipo.grupo}, para mejor o
          para peor. En pérdidas, faltas y las métricas defensivas del rival, menos es mejor. El
          ritmo, el porcentaje de triples intentados, la forma y la suerte describen estilo, no
          calidad, así que no se colorean.
        </p>
        </div>
        </>
      ) : vistaFicha === 'dossier' ? (`);

fs.writeFileSync(f, s);
console.log('Equipo.jsx: umbral por desviación típica y leyenda de colores');
