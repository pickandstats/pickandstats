# Pick&Stats — guía para Claude

Estadísticas de baloncesto FEB (Primera, Segunda y Tercera masculinas) en
pickandstats.es. Proyecto individual. Datos de fuentes **públicas** de la FEB:
la web de resultados y las actas oficiales en PDF.

> **ARQUITECTURA.md es la fuente de verdad.** Este fichero es solo un índice
> operativo. Cuando haya duda sobre el porqué de algo, la respuesta está allí,
> no aquí. Y cuando hagas un cambio importante —una decisión de diseño, un
> gotcha nuevo, un comportamiento no obvio— **documéntalo en ARQUITECTURA.md**.
> Un mensaje de commit no basta: nadie relee el historial, y la sesión en la
> nube (ver más abajo) trabaja leyendo ese documento.

## Los tres bloques

| Carpeta | Qué es | Stack |
|---|---|---|
| `scraper/` | Descarga de la FEB y procesado a JSON. Scripts de CLI, sin framework. | Node 24, axios, cheerio, pdf-parse |
| `web/` | La app de estadísticas: tablas, fichas, gráficos, comparador. Se sirve en `/app/`. | React + Vite, Recharts |
| `site/` | El sitio editorial: las guías que explican cada métrica. Se sirve en la raíz. | Astro (tiene su propio `site/CLAUDE.md`) |

Complementos: `data/` (raw gitignored, processed versionado), `test/`
(regresión sobre temporadas cerradas), `.github/workflows/` (datos semanales +
despliegue a GitHub Pages).

Detalle de cada script en ARQUITECTURA.md §4, modelo de datos en §5, vistas de
la app en §7, automatización en §9.

## Comandos habituales

```bash
# Pipeline de datos. --competicion 1=Primera 2=Segunda 3=Tercera (por defecto 3)
node scraper/scrape.js --competicion 3              # detecta la temporada sola
node scraper/calcular.js --competicion 3 --temporada 2025
node scraper/historico.js --competicion 3

# Cuartos: extraer -> VERIFICAR -> generar. El verificador es un guardián real.
node scraper/actas-cuartos.js    --competicion 3 --temporada 2025
node scraper/verificar-cuartos.js --competicion 3 --temporada 2025 \
  && node scraper/calcular-cuartos.js  --competicion 3 --temporada 2025 \
  && node scraper/boxscore-cuartos.js  --competicion 3 --temporada 2025

node scraper/temporada-actual.js    # qué temporada cree la FEB que es la vigente
node test/regresion.cjs             # las temporadas cerradas no deben cambiar

cd web && npm run dev               # app React
cd site && npm run dev              # sitio Astro

gh run list --workflow=actualizar-datos.yml    # estado del scraping semanal
```

Pruebas baratas antes de una tanda larga: `--grupo E-A`, `--max-jornadas 1`,
`--limite 5`.

## Gotchas críticos

Los que muerden de verdad. La lista completa está en ARQUITECTURA.md §11 y §17.

- **Verifica siempre antes de generar.** `verificar-cuartos.js` sale con
  código 1 y corta la cadena si las actas no están sanas. No te fíes del
  "N ya existían" del extractor: no garantiza que esas actas sean buenas.
- **`actas-cuartos.js` salta por existencia del fichero, no por calidad.** Un
  acta guardada a medias no se re-extrae jamás por sí sola (§17.1). Para
  reanudar tras un cambio de esquema: borra las incompletas y relanza **sin**
  `--forzar`. Con `--forzar` re-extrae la temporada entera (Tercera: ~3 h).
- **Las actas son caché gitignored** (`data/raw/*/*/actas/`, ~100 MB) y solo
  existen en la cache de GitHub Actions. Los agregados que sirve la app sí se
  versionan. Regla mental: si la app lo sirve, va a git.
- **Los ficheros de cuartos viven en `web/public/data/`**, no en
  `data/processed/` como el resto. Inconsistencia conocida; importa para el
  `git add` del workflow y para el `cp -r` del despliegue.
- **Cruza por identificador estable, nunca por nombre**: jugadores por
  idJugador (licencia FEB), equipos por idClub/slug, acta↔boxscore por dorsal.
  La FEB cambia el id de equipo cada año y trunca nombres de forma
  inconsistente.
- **1,2 s entre peticiones** (`PAUSA_MS`). Es la web de la FEB; no bajar de ahí.
- **No usar la API autenticada de la FEB.** Decisión ética, no técnica
  (ARQUITECTURA.md §10). Los shot charts esperan a que la FEB conteste.
- **GUIA_SCRAPING.md está parcialmente desactualizada**: es anterior al soporte
  multi-competición, así que sus rutas (`data/raw/<temporada>/...`, sin el
  segmento de competición) y la URL de clonado ya no valen. Sigue siendo útil
  como manual operativo; para rutas y estructura, manda ARQUITECTURA.md.

## Trabajo en paralelo con la sesión de Claude en la nube

En este proyecto trabajan **dos Claude a la vez sobre la misma carpeta**:

- **Tú, aquí, con shell.** Ejecutas scrapers, builds y tests, haces commits y
  consultas GitHub Actions. Eres quien puede *comprobar* cosas ejecutándolas.
- **Una sesión de Cowork en la nube, sin shell.** Tiene lectura y escritura
  sobre esta carpeta. Se ocupa del contexto, el análisis, la documentación y
  las decisiones de producto.

### Canal de ida: escribe los informes a disco

Cuando produzcas un informe, análisis o diagnóstico, escríbelo **siempre** a un
fichero `_informe-<tema>.md` en la raíz, no solo por terminal. Están en
`.gitignore` (`_informe*.md`, `_informe.txt`), así que no ensucian el repo. La
sesión en la nube los lee directamente.

Un informe que solo existe en tu terminal es un informe que alguien tiene que
copiar y pegar a mano.

**Y no solo los informes.** Cualquier respuesta tuya que requiera criterio de la
sesión en la nube —una propuesta de implementación, una duda de diseño, un "hay
dos formas de hacer esto"— también va a un `_informe-<tema>.md`, por breve que
sea. La regla práctica: **si esperas que alguien opine antes de seguir, ese texto
tiene que existir en disco.**

**Los `_informe*` son desechables.** Lo que merezca sobrevivir se incorpora a
ARQUITECTURA.md o al documento de estado del proyecto. No los acumules como si
fueran documentación: son un canal de paso, no un archivo.

### Canal de vuelta: la nube edita estos ficheros

Esto es lo importante. **La sesión en la nube edita ficheros de este repo
directamente.** Las secciones 6 y 17 de ARQUITECTURA.md las escribió ella.

Por tanto:

- **Antes de editar cualquier documento compartido, vuelve a leerlo del disco.**
  Tu última lectura puede estar obsoleta aunque tú no hayas tocado nada.
- **Nunca sobrescribas un fichero entero a partir de una versión que leíste
  hace varios turnos.** Prefiere ediciones puntuales sobre una lectura fresca.

### Los commits los haces tú (norma permanente)

**TODOS los commits del proyecto los haces tú**, incluidos los cambios que haya
escrito la sesión en la nube. Ella edita ficheros pero **no commitea**.

- **Antes de cada tanda, mira `git status`.** Si hay ficheros modificados que tú
  no tocaste, son suyos.
- **Léelos** antes de commitearlos —distribuyes lo que commiteas, y debes haber
  visto lo que va a git.
- **Commitéalos aparte, con su propio mensaje**, dejando claro que el contenido
  lo escribió la sesión en la nube. No los mezcles con tu trabajo ni los
  atribuyas a ti.

### Formato de informe que funciona

- **Hallazgos priorizados por riesgo** (crítico → bajo), no por orden de
  descubrimiento.
- **Referencias `fichero:línea`** para todo lo que se pueda señalar.
- **Distingue explícitamente lo verificado de lo deducido**: qué comprobaste
  ejecutando (y con qué salida real) frente a qué inferiste leyendo código. La
  sesión en la nube no puede ejecutar nada, así que esa distinción es justo lo
  que ella no puede reconstruir por su cuenta.
- Si montas un sandbox para probar algo, dilo, y di también que lo limpiaste y
  que producción quedó intacta.
