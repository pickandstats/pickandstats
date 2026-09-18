// Compara la cinta de navegación de site/src/layouts/Base.astro y
// web/src/CintaNav.jsx: mismo número de enlaces, mismo orden, mismos href,
// mismos textos. Ignora class/className a propósito: el enlace activo de la
// app (className="activo" en Estadísticas) es una diferencia legítima.
//
// El comentario "debe mantenerse idéntica" que llevaba semanas en ambos
// ficheros no evitó que la app se quedara con tres enlaces una semana
// entera cuando el sitio ganó el cuarto (Observatorio, 11/9/2026). Un
// invariante que solo vive en un comentario no es un invariante: este
// script lo hace ejecutable, y desplegar.yml lo corre ANTES de construir,
// bloqueando el despliegue si difieren.
//
// Uso: node test/verificar-cinta.cjs
const fs = require('fs');
const path = require('path');

const FICHEROS = {
  sitio: path.join('site', 'src', 'layouts', 'Base.astro'),
  app: path.join('web', 'src', 'CintaNav.jsx'),
};

// Extrae el bloque <nav class="cinta-nav">...</nav> (o className=) y, de
// dentro, la lista ordenada de {href, texto} de cada <a>.
function extraerCinta(contenido) {
  const bloque = contenido.match(/<nav\s+class(?:Name)?="cinta-nav">([\s\S]*?)<\/nav>/);
  if (!bloque) return null;
  const enlaces = [];
  const reA = /<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  let m;
  while ((m = reA.exec(bloque[1]))) {
    enlaces.push({ href: m[1], texto: m[2].trim() });
  }
  return enlaces;
}

let error = false;
const listas = {};
for (const [clave, fichero] of Object.entries(FICHEROS)) {
  if (!fs.existsSync(fichero)) {
    console.error(`✗ No existe ${fichero}`);
    error = true;
    continue;
  }
  const contenido = fs.readFileSync(fichero, 'utf8');
  const enlaces = extraerCinta(contenido);
  if (!enlaces || !enlaces.length) {
    console.error(
      `✗ No se encontró la cinta (.cinta-nav) en ${fichero}. ` +
      'Si el marcado cambió, actualiza este extractor: no des el cotejo por bueno sin haber comprobado nada.'
    );
    error = true;
    continue;
  }
  listas[clave] = enlaces;
}

if (error) process.exit(1);

const { sitio, app } = listas;
const igual = sitio.length === app.length &&
  sitio.every((e, i) => e.href === app[i].href && e.texto === app[i].texto);

if (igual) {
  console.log(`✓ La cinta coincide: ${sitio.length} enlaces iguales en orden, href y texto.`);
  process.exit(0);
}

console.log('✗ La cinta de site/src/layouts/Base.astro y web/src/CintaNav.jsx NO coincide.\n');
const maxLen = Math.max(sitio.length, app.length);
const fmt = e => (e ? `${e.texto} -> ${e.href}` : '(falta)');
console.log('    #  Base.astro (sitio)                 CintaNav.jsx (app)');
for (let i = 0; i < maxLen; i++) {
  const igualFila = sitio[i] && app[i] && sitio[i].href === app[i].href && sitio[i].texto === app[i].texto;
  const marca = igualFila ? '   ' : ' ✗ ';
  console.log(`${marca}${String(i + 1).padStart(2)}  ${fmt(sitio[i]).padEnd(34)} ${fmt(app[i])}`);
}
console.log('');
process.exit(1);
