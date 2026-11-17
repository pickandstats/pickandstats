// web/public/data es un espejo de data/processed, no una fuente (lote 35, opcion
// a). Antes estaba versionado: 2.757 ficheros duplicados en git que la copia de
// preview ensuciaba (3.000 entradas en git status, revertidas a mano mas de una
// vez) y que, cuando un deploy fallaba, se quedaban viejos (ARQUITECTURA §17.7).
// Ahora se genera aqui antes de `npm run dev` y `npm run build`; el deploy sigue
// haciendo su propio cp antes del build, asi que esto ahi es redundante e inocuo.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(web, '..', 'data', 'processed');
const destino = join(web, 'public', 'data');

if (!existsSync(origen)) {
  console.error(`No existe ${origen}: sin datos procesados que servir.`);
  process.exit(1);
}
// Limpia antes de copiar: un fichero que ya no existe en data/processed no debe
// seguir sirviendose desde un espejo viejo.
rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, { recursive: true });
console.log(`web/public/data regenerado desde data/processed`);
