const fs = require('fs');
const f = 'web/src/RadarJugador.jsx';
let s = fs.readFileSync(f, 'utf8');

const ini = s.indexOf("      {!mismoGrupo && ref === 'grp' && (");
const fin = s.indexOf('      )}\n', ini) + '      )}\n'.length;
if (ini < 0 || fin < ini) { console.log('No encuentro el aviso'); process.exit(1); }

const nuevo = `      {!mismoGrupo && ref === 'grp' && (
        <p className="aviso-dato">
          Los dos jugadores son de grupos distintos, así que cada percentil se mide
          contra rivales diferentes. Leído así, esta vista no dice quién es mejor, sino
          <strong> cuánto pesa cada uno en su propio grupo</strong>, que es información
          útil para preparar un cruce. Si lo que buscas es compararlos en igualdad de
          condiciones, cambia a la referencia <strong>nacional</strong>.
        </p>
      )}
`;
s = s.slice(0, ini) + nuevo + s.slice(fin);
fs.writeFileSync(f, s);
console.log('RadarJugador: aviso reformulado, explica qué mide cada referencia');
