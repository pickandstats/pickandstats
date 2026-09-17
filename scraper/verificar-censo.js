// Compara el censo de equipos de las guias editoriales (site/src/content/guias/
// equipos-<categoria>.md) contra los nombres oficiales del calendario ya
// descargado (data/processed/<comp>/<temporada>/calendario.json), de la
// temporada mas reciente disponible.
//
// LA REGLA: el nombre bueno es el del calendario de la FEB, literal, aunque la
// prensa vaya por delante anunciando un patrocinio nuevo. La app pinta los
// nombres que vienen de la FEB, asi que seguir a la prensa antes de tiempo deja
// la guia diciendo una cosa y la app otra (17/9/2026: paso exactamente con
// BCBadajoz y Ciudad Molina Basket, que la prensa ya llamaba con su nuevo
// patrocinador pero el calendario tardo unos dias mas en registrarlo). El
// calendario se refresca cada semana via el cron de datos: si la FEB inscribe
// un nombre nuevo, este verificador lo detectara en su siguiente ejecucion.
//
// Avisa, no bloquea: los cambios de patrocinador y las abreviaturas
// editoriales dan falsos positivos legitimos. Dos que ya se investigaron y se
// dejan a proposito, para no reinvestigarlos desde cero cada vez:
//   - "Construcciones Gonzalo Crespo Pas Piélagos" (Tercera, grupo A-A): en la
//     guia va abreviado "Constr. Gonzalo Crespo Pas Piélagos". Es el mismo
//     club, cosmetico.
//   - "Eset Ontinet" (Tercera, grupo E-B): la guia dice "Eset Ontinent", con
//     una n mas. El pueblo es Ontinyent/Ontinent; "Ontinet" parece una errata
//     que la propia FEB arrastra en origen, no nuestra. Se deja como esta en
//     la guia.
// La lista que imprime este script es de "revisar", no de "errores": antes de
// tocar una guia por lo que salga aqui, contrastalo con el calendario mismo
// (autoridad) y, si hace falta mas contexto sobre el porque, con la prensa.
// No esta enchufado al workflow semanal: de ejecucion manual, y conviene
// pasarlo cada pocas semanas y antes de cada corte del observatorio.
//
// Uso: node scraper/verificar-censo.js
const fs = require('fs');
const path = require('path');

const GUIAS = path.join('site', 'src', 'content', 'guias');
const COMPS = {
  primerafeb: 'equipos-primera-feb.md',
  segundafeb: 'equipos-segunda-feb.md',
  tercerafeb: 'equipos-tercera-feb.md',
};

// Rango Unicode de marcas diacriticas combinantes (0300-036F), construido con
// codigos de caracter para no depender de escapes \u en el fichero fuente.
const RE_DIACRITICOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const sinAcentos = s => String(s).normalize('NFD').replace(RE_DIACRITICOS, '');
const normalizar = s => sinAcentos(s).toUpperCase()
  .replace(/[.'’`´]/g, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

function temporadaMaxima(comp) {
  const dir = path.join('data', 'processed', comp);
  const temporadas = fs.readdirSync(dir).filter(f => /^\d{4}$/.test(f));
  return temporadas.sort().at(-1);
}

// Extrae los nombres de equipo de una guia de censo, sea cual sea su formato:
// listas numeradas ("1. Nombre") o listas separadas por " · " (Tercera FEB).
// Generico a proposito: si la guia cambia de formato, es mejor que este
// extractor deje de encontrar nombres (y el aviso de abajo lo delate) a que
// dependa de nombres de equipo concretos que quedaran obsoletos.
function extraerNombresDeGuia(md) {
  const nombres = [];
  for (const bloque of md.split(/\n\s*\n/)) {
    const lineas = bloque.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lineas.length) continue;
    if (lineas.every(l => /^\d+\.\s+/.test(l))) {
      for (const l of lineas) nombres.push(l.replace(/^\d+\.\s+/, '').trim());
    } else if (lineas.some(l => l.includes(' · '))) {
      for (const n of lineas.join(' ').split(' · ')) if (n.trim()) nombres.push(n.trim());
    }
  }
  return nombres;
}

console.log('\n=== VERIFICACION DEL CENSO DE EQUIPOS ===\n');

let totalRevisar = 0;

for (const [comp, ficheroGuia] of Object.entries(COMPS)) {
  const temp = temporadaMaxima(comp);
  const fCalendario = path.join('data', 'processed', comp, temp, 'calendario.json');
  const fGuia = path.join(GUIAS, ficheroGuia);

  if (!fs.existsSync(fCalendario)) { console.log(`${comp}: sin calendario.json en ${fCalendario}, salto.`); continue; }
  if (!fs.existsSync(fGuia)) { console.log(`${comp}: sin guia en ${fGuia}, salto.`); continue; }

  const calendario = JSON.parse(fs.readFileSync(fCalendario, 'utf8'));
  const oficiales = new Set();
  for (const p of calendario.partidos) { oficiales.add(p.local); oficiales.add(p.visitante); }

  const guia = fs.readFileSync(fGuia, 'utf8');
  const nombresGuia = extraerNombresDeGuia(guia);
  const normalizadosGuia = new Set(nombresGuia.map(normalizar));

  const revisar = [...oficiales]
    .filter(o => !normalizadosGuia.has(normalizar(o)))
    .sort();

  console.log(`${comp} (temporada ${temp})`);
  console.log(`  Equipos en el calendario oficial: ${oficiales.size}`);
  console.log(`  Nombres extraidos de la guia:     ${nombresGuia.length}`);
  if (!revisar.length) {
    console.log('  Sin discrepancias.');
  } else {
    console.log(`  A REVISAR (${revisar.length}): no aparecen en la guia con ese nombre normalizado:`);
    for (const r of revisar) console.log(`    - ${r}`);
  }
  console.log('');
  totalRevisar += revisar.length;
}

console.log(totalRevisar
  ? `Total a revisar: ${totalRevisar}. Contrasta cada uno contra la web de la FEB antes de tocar nada: puede ser una abreviatura editorial legitima, no un nombre desactualizado.`
  : 'Todo el censo coincide con el calendario oficial.');
console.log('');
