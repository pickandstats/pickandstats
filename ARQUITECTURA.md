# Pick&Stats — Documento de arquitectura

> Documento de referencia del sistema. Combina visión conceptual (qué es cada
> pieza y por qué) y operativa (cómo se hace, comandos, gotchas). Complementa
> a GUIA_SCRAPING.md, que es el manual operativo de la actualización habitual.

## 1. Qué es Pick&Stats

Pick&Stats (pickandstats.es) es una plataforma de estadísticas de baloncesto
para las tres categorías FEB masculinas: Primera FEB, Segunda FEB y Tercera
FEB. Es un proyecto de desarrollo individual.

Su propuesta de valor se apoya en dos pilares: **acceso gratuito** y
**contenido explicativo propio** (guías que explican cada métrica, ligadas a
datos reales FEB). Un tercer rasgo —cubrir estas tres categorías— existe pero
*no* es un diferencial exclusivo: hay competidores que también las cubren
(Data4Basket, BasketData, BueStats). Lo que distingue a Pick&Stats es ser
gratis y editorializar los datos, no el mero hecho de cubrir la FEB.

Todos los datos provienen de fuentes **públicas** de la FEB: la web de
resultados (baloncestoenvivo.feb.es) y las actas oficiales en PDF de cada
partido. Existe una API interna de la FEB con datos más ricos (tiro con
coordenadas para shot charts), pero requiere autenticación y no se usa:
acceder a ella sin permiso sería saltarse la autenticación. La vía legítima
—solicitar acceso a la FEB— está pendiente de respuesta.

## 2. Arquitectura general

El proyecto son tres bloques que viven en un mismo repositorio
(~/Documents/pickandstats):

**Scrapers (Node.js)** — en `scraper/`. Descargan datos de la FEB y los
procesan en JSON. No usan framework; son scripts de línea de comandos con
axios (peticiones), cheerio (parseo HTML) y pdf-parse (lectura de actas PDF).

**App de estadísticas (React + Vite)** — en `web/`, servida bajo la ruta
`/app/` del dominio (config `base: '/app/'` en vite.config.js). Es la
aplicación interactiva: tablas, fichas de jugador/equipo/partido, gráficos
(Recharts), análisis. Consume los JSON generados por los scrapers.

**Sitio de contenido (Astro)** — en `site/`, servido en la raíz del dominio.
Es la parte editorial: las guías explicativas de métricas, el contenido que
diferencia la plataforma. Estructura Astro estándar (components, content,
layouts, pages).

**Hosting y automatización:** todo se aloja en GitHub Pages. Dos flujos de
GitHub Actions lo mantienen: uno actualiza los datos semanalmente (scraping
automático los lunes), otro despliega la web en cada push a main. El
despliegue ensambla el sitio Astro en la raíz y la app React en /app/.

## 3. El pipeline de datos, de principio a fin

El flujo general es **scrape → procesar → publicar**, con una fase de
verificación intercalada para los datos por cuartos.

**Paso 1 — Scraping.** `scrape.js` descubre la estructura de una competición
(grupos → jornadas → partidos) y descarga el boxscore de cada partido jugado
a `data/raw/<comp>/<temp>/<grupo>/<id>.json`. Para los datos por cuartos,
`actas-cuartos.js` descarga además la acta oficial en PDF de cada partido y
extrae de ella el rendimiento por periodo, guardándola en
`data/raw/<comp>/<temp>/actas/<id>.json`.

**Paso 2 — Procesado.** `calcular.js` agrega los boxscore brutos en
estadísticas de jugadores y equipos (básicas y avanzadas), por licencia FEB
(idJugador), y escribe en `data/processed/`. Para los cuartos,
`calcular-cuartos.js` y `boxscore-cuartos.js` agregan las actas en los
ficheros que consume la app.

**Paso 3 — Verificación** (solo cuartos). `verificar-cuartos.js` comprueba,
antes de generar los agregados de cuartos, que las actas están completas y
coherentes. Actúa de guardián: si faltan actas o contexto, corta la
generación para no producir datos a medias.

**Paso 4 — Publicación.** Los JSON procesados se copian a `web/public/data/`
y la app los sirve. El despliegue en GitHub Pages hace el resto.

**Distinción clave — caché vs producto final:** las actas brutas
(`data/raw/.../actas/`) son caché regenerable y están en .gitignore (no se
versionan; ocupan ~85 MB). Los agregados que consume la app (incluidos los de
cuartos) son producto final y sí se versionan, aunque se regeneren, porque
son lo que se sirve.

## 4. Los scrapers (inventario)

Todos en `scraper/`, ejecutables con
`node scraper/<script>.js [--competicion N] [--temporada AAAA]`. Config común
en config.js (BASE baloncestoenvivo.feb.es, las tres competiciones, pausa de
1.2s entre peticiones por cortesía). Agrupados por función:

**Descubrimiento y descarga (liga regular):**
- `scrape.js` — el scraper principal: descubre grupos → jornadas → partidos → boxscores.
- `actas-cuartos.js` — descarga y extrae las actas PDF (rendimiento por cuarto) de cada partido. Salta las que ya existen salvo --forzar.
- `anadir-cuartos.js` — añade el marcador por cuartos a partidos ya guardados sin re-descargar boxscores.

**Descarga (fases finales):**
- `scrape-fases.js` — descarga los partidos de fases (playoffs, ascensos), que la FEB estructura aparte.
- `rescatar-*.js` (cruceA-2023, fases-huecos, ffa1, final-primera-2025, semis-segunda-2025) — rescates puntuales de partidos que la FEB no enlaza en sus listados pero existen por ID directo. Scripts de un solo uso.

**Procesado:**
- `calcular.js` — agrega boxscore → estadísticas de jugadores/equipos (básicas + avanzadas), por licencia FEB.
- `calcular-cuartos.js` — agrega actas → distribución por cuarto + clutch (jugadores), pace/rating por cuarto + contexto (equipos), y contexto por partido.
- `boxscore-cuartos.js` — genera un fichero por partido con el boxscore de jugadores por cuarto.
- `calcular-fases.js` / `calcular-fases-jugadores.js` — estadística de las fases finales, aparte de la liga regular (muestras pequeñas que no deben mezclarse con las medias de temporada).
- `calcular-calendario.js` — genera el calendario de partidos aún no jugados.
- `historico.js` — índice histórico cruzando todas las temporadas por licencia.

**Verificación y diagnóstico:**
- `verificar-cuartos.js` — guardián de integridad de los datos por cuartos antes de generar.
- `chequeo-integridad.js` — detecta huecos en las fases descargadas.
- `diagnostico-fase.js` / `diagnostico-ffa1.js` — diagnóstico de fases concretas.

**Registro de clubes e identidad:**
- `generar-clubes.js` — registro de clubes con identificador propio y estable (la unidad de identidad es la aparición: nombre + competición + temporada, porque un mismo nombre puede ser primer equipo y filial a la vez).
- `detectar-renombrados.js` — detecta clubes que cambian de nombre entre temporadas (la FEB da id nuevo cada año, pero las licencias de jugador son estables: si dos equipos comparten plantilla, son el mismo club con otro patrocinador).

**Datos que apenas cambian (se amplían, no se regeneran):**
- `datos-jugadores.js` — datos personales (nacimiento, nacionalidad, altura).
- `datos-equipos.js` — datos de club (pabellón, dirección, web, etc.).

**Utilidades de temporada y calendario:**
- `temporada-actual.js` — detecta la temporada vigente leyendo el desplegable de la FEB (evita editar la config a mano cada septiembre).
- `refrescar-calendario.js` — refresca el calendario de la temporada próxima en pretemporada.

**Exploradores (históricos):**
- `explorar.js` a `explorar7.js` — scripts de exploración usados para descubrir cómo sirve la FEB sus datos (HTML estático vs API, estructura de grupos y jornadas, disección de la página de partido). Ya cumplieron su función; se conservan como registro de cómo se resolvió el acceso.

## 5. El modelo de datos

**Ficheros que sirve la app** (en `web/public/data/<comp>/<temp>/`):
- `jugadores.json` — estadística agregada por jugador (idJugador, equipoId, pj, pt, rebotes ro/rd/rt, as, robos br, pérdidas bp, valoración va, tiros t2a/t2i/t3a/t3i, y avanzadas).
- `equipos.json` — estadística agregada por equipo (incluye idClub, identificador estable).
- `partidos.json` — todos los partidos con su boxscore y parciales por cuarto.
- `jugadores-cuartos.json` / `equipos-cuartos.json` — agregados por cuarto (distribución, clutch, pace/rating, contexto).
- `partidos-contexto.json` — contexto por cuarto de cada partido (indexado por id, carga diferida).
- `boxscore-cuartos/<id>.json` — un fichero por partido con el boxscore de jugadores por cuarto (carga diferida).
- `fases.json` / `fases-jugadores.json` — datos de las fases finales.

**Identificadores estables** (clave para cruzar datos entre temporadas y fuentes):
- Jugadores: idJugador (licencia FEB, estable entre años).
- Equipos: idClub / slug (estable), NO el id FEB (que cambia cada temporada con el patrocinador).
- Cruce acta↔boxscore: por dorsal dentro de cada partido (nunca por nombre — la FEB trunca nombres de forma inconsistente).

**Caché vs producto final** (corregido el 02/09/2026; la versión anterior decía
que `data/raw/` entero estaba gitignored, y no es cierto):
- Caché regenerable (gitignored): **solo** `data/raw/*/*/actas/` (~100 MB) y `data/actas/`. Son las dos únicas rutas de datos que excluye el .gitignore.
- **Versionado:** el resto de `data/raw/` —los boxscores brutos y los `_indice.json` de cada grupo— sí está en git, y el workflow lo commitea con `git add data/`.
- Producto final (versionado): los agregados en `web/public/data/`, aunque se regeneren. Razón: son lo que la app sirve, deben estar en el repo para el despliegue.

Esa distinción dejó de ser trivia el 02/09/2026: el canario de transición
(`comprobar-temporada.js`, §17.2) decide si la temporada nueva ha empezado
leyendo los `_indice.json` de la temporada máxima. Funciona en CI **porque esos
índices están versionados** y sobreviven al checkout limpio de cada ejecución. Si
algún día se ampliara el .gitignore a `data/raw/` entero, el canario dejaría de
dispararse en silencio —el mismo tipo de fallo mudo que fue creado para detectar.

## 6. El sistema de análisis por cuartos

Es la capa construida más recientemente y la más distintiva. Parte de una
idea que parecía bloqueada (los datos por cuarto ricos están tras la API
autenticada de la FEB) y la resuelve por vía pública: las actas oficiales en
PDF.

**La fuente — las actas PDF.** Cada partido FEB tiene un acta pública en PDF
(BoxScore.aspx?p=<id>&c=<N>&qd=<M>). El parámetro c es el corte acumulado
hasta ese periodo, qd el total de periodos. Restando cortes consecutivos se
obtiene el rendimiento de cada cuarto por separado. La detección de periodos
es en dos pasos (primero cuántos periodos tuvo el partido —maneja prórrogas—,
luego los cortes). Se manejan actas truncadas y con huecos.

**Qué se extrae por cuarto:**
- Boxscore completo de cada jugador (los 20 campos: puntos, tiros, rebotes, asistencias, etc.).
- Parciales de marcador.
- Contexto: puntos de contraataque, en la pintura, de segunda oportunidad, tras pérdida del rival, y desde el banquillo. El contexto es acumulativo en el acta, así que se desglosa por cuarto restando cortes (solo los campos sumables; máxima ventaja y mejor racha son records, no se desglosan).

**Qué se calcula a partir de ahí:**
- Distribución por cuarto del jugador (puntos, valoración por periodo).
- Índice clutch: puntos + asistencias en el último cuarto (y prórroga) de partidos que llegaron al periodo final con ≤8 puntos de diferencia. Se muestra siempre el nº de partidos "ajustados" como aviso del tamaño de muestra.
- Pace y rating ofensivo/defensivo por cuarto (equipos).
- Contexto por cuarto a favor y en contra (equipos).

**Referencias validadas sobre datos reales:** pace ~18-19 en Primera/Segunda,
~20 en Tercera (categoría más rápida); pintura ~14-24 puntos/cuarto sumando
ambos equipos.

**Precisión sobre qué comprueba realmente el verificador** (corregido el
02/09/2026; la versión anterior de este párrafo afirmaba de más): de esas
referencias, `verificar-cuartos.js` solo calcula la media de pintura, y la
**imprime sin que entre en el veredicto**. El pace no se comprueba en ningún
sitio: solo aparece en `calcular.js` y `calcular-cuartos.js`, que lo generan.
El veredicto depende únicamente de dos condiciones: actas sin
`contextoPorCuarto`, y "valores raros" —un umbral por cuarto individual
(`total < 0 || total > 60`) que es un detector de disparates, no un test
estadístico, y por eso es inmune al tamaño de la muestra. Conviene tenerlo
presente: el verificador comprueba **presencia y coherencia gruesa**, no
plausibilidad estadística.

## 7. Las vistas de la app

La app (React, bajo /app/) organiza la información en fichas con modos
(pestañas) para gestionar la densidad de datos. Componentes principales en
`web/src/`:

**Tablas generales:** Jugadores.jsx, Equipos.jsx (listados ordenables con
modos Básica/Detalle/Avanzada), Clasificacion.jsx, Partidos.jsx.

**Ficha de jugador** (Jugador.jsx) — modos Básica/Detalle/Avanzada/Per-40/
Gráfico, más "Por cuartos" (distribución por periodo + índice clutch).
Incluye radar (RadarJugador.jsx) y dispersión (DispersionJugadores.jsx).

**Ficha de equipo** (Equipo.jsx) — modos Resumen/Análisis/Preparar partido/
Información, más "Por cuartos" (eficiencia y ritmo por periodo + contexto a
favor/en contra con selector multiselección de cuartos). Es el componente más
grande; alberga el análisis y el dossier.

**Ficha de partido** (Partido.jsx) — marcador por cuartos con el cuarto
decisivo resaltado, contexto por cuarto de ese partido (carga diferida), y las
tablas de boxscore de jugadores que un único selector de cuartos filtra
(muestra el boxscore sumado de los cuartos elegidos). Si un partido no tiene
desglose completo, cae al total —robusto.

**Análisis y dossier:** AnalisisEquipo.jsx (análisis narrativo del equipo) y
DossierPartido.jsx (preparación de un partido contra un rival, con
exportación a PDF). Ver sección 8.

**Navegación y apoyo:** App.jsx (rutas y carga de datos), CintaNav.jsx,
Buscador.jsx, Inicio.jsx, Leyenda.jsx (glosario de todas las métricas),
PlayOff.jsx / FasesAscenso.jsx (fases finales), ConsentBanner.jsx.

**Patrón de carga:** los datos base se cargan al entrar en una categoría; los
datos pesados por partido (contexto, boxscore por cuarto) se cargan de forma
diferida, solo al abrir una ficha de partido, con .catch para no romper si un
fichero no existe (categorías o partidos sin datos muestran el resto).

## 8. El análisis narrativo generado

Dos vistas generan texto analítico automáticamente a partir de los datos. No
es prosa escrita a mano: son frases derivadas de comparar cada métrica con la
media de su grupo, con umbrales explícitos. Es análisis anclado en datos.

**AnalisisEquipo.jsx** — genera seis bloques: Identidad de juego, En ataque,
En defensa, Fortalezas, Debilidades, Claves para enfrentarlo. El mecanismo
central es la función nivel(valor, media): calcula la desviación relativa de
una métrica respecto a la media del grupo y la clasifica en -2..+2 (umbrales
6% y 15%). Solo se genera una frase cuando la desviación es notable. Cada
afirmación está respaldada por una desviación real.

**DossierPartido.jsx** — prepara un partido contra un rival concreto: compara
ataque vs defensa por facetas (Four Factors), genera "claves del partido"
según las ventajas, lista los jugadores a vigilar del rival con su perfil, y
muestra una comparativa directa. Exportable a PDF.

**Detección de cierre por cuartos** (recalibración reciente) — tanto el
análisis como el dossier incorporan una detección de perfil de cierre:
comparan el net rating (ataque − defensa) del último cuarto con la media de
los cuartos del equipo. Si se desvía ≥6 puntos en diferencia absoluta, se
genera una lectura: "cierra fuerte" / "le cuesta cerrar" (identidad), o una
clave táctica sobre el rival ("llega vivo al último cuarto..." / "cuidado con
relajarse con ventaja..."). Detalle importante del umbral: se usa diferencia
absoluta (±6 puntos), no porcentual. El net rating cruza el cero, así que el
porcentaje relativo produce artefactos (un equipo con media 0.4 y Q4 -1 daría
"-471%" siendo una diferencia trivial). Se validó sobre datos reales que ±6
capta los patrones genuinos (Oviedo +8.8, Zamora +9.7, Gipuzkoa -6.7) y
descarta el ruido.

**Exportación a PDF del dossier** — botón "Imprimir / Guardar PDF" que usa
window.print() con CSS @media print. El CSS imprime solo el dossier (oculta el
resto de la interfaz), con fondo blanco, encabezado de marca, saltos de página
controlados y la tabla de jugadores maquetada para papel (perfil en línea
propia bajo cada jugador). El título del documento se fija dinámicamente
("Dossier · equipo vs rival"). Elegido frente a librerías (jsPDF/html2canvas)
por dar mejor calidad (texto real, no imagen) sin dependencias. Limitación
conocida: las notas de cabecera/pie del navegador (fecha, URL, nº de página)
no se pueden quitar por CSS; pendiente un futuro servicio de generación al
vuelo.

## 9. La automatización (GitHub Actions)

Dos flujos en `.github/workflows/`:

**actualizar-datos.yml — actualización semanal de datos.** Se ejecuta los
lunes a las 07:00 UTC (y bajo demanda con el botón "Run workflow"). Para cada
categoría (Tercera, Segunda, Primera): scrapea partidos nuevos, calcula
estadísticas, actualiza histórico y fases. Después, un bloque de cuartos por
categoría: extrae actas nuevas, verifica, y —solo si la verificación pasa—
genera agregados y boxscore. Finalmente refresca el calendario, comprueba que
las temporadas cerradas no cambiaron (test de regresión), y commitea los
cambios.

Detalles clave de este workflow:
- Cache de actas (actions/cache): las actas (data/raw/.../actas/) persisten entre ejecuciones semanales, con clave que rota por ejecución y fallback a la más reciente. Sin esto, al ser las actas caché gitignored, CI las re-extraería todas cada semana (horas). Con la cache, solo se descargan las de partidos nuevos.
- El verificador como guardián: los pasos de cuartos encadenan verificar && calcular && boxscore. Si el verificador detecta que faltan actas o contexto, sale con código 1 y la generación NO corre —protege los datos versionados de ser sobrescritos con datos incompletos. Esto hace seguro incluso el primer run con cache vacía.
- continue-on-error en los pasos de cuartos: un fallo ahí (cache expirada, PDF caído) no tumba la actualización del resto de datos.
- git add data/: los cuartos ya viven en data/processed/ (unificados el 3/9/2026, §17.4), así que quedan cubiertos por `git add data/` como el resto.

**desplegar.yml — despliegue en GitHub Pages.** Se ejecuta en cada push a
main. Compila el sitio Astro (→ raíz del dominio) y la app React (→ /app/),
copia los datos procesados (cp -r data/processed/. web/public/data/), y —tras el
build y antes de publicar— un guardián (`verificar-cuartos-desplegados.js`)
comprueba que los cuartos de la temporada en curso están en `web/dist`: si
faltan, el deploy falla y el sitio se queda en la versión anterior (correcta) en
vez de publicarse sin cuartos. Ensambla la salida (verifica que el CNAME esté
presente para no perder el dominio) y publica. Desde la unificación, los cuartos
llegan a producción por el mismo `cp` que el resto de agregados, así que un deploy
con `rsync --delete` ya no los perdería.

## 10. Decisiones de diseño y su porqué

Las decisiones no obvias, con su razón —para que el "tú del futuro" no las
deshaga sin querer:

**Actas como caché gitignored, agregados versionados.** Las actas brutas son
regenerables y ocupan mucho (~85 MB); no se versionan. Los agregados que
sirve la app sí, aunque se regeneren, porque son el producto que se despliega.
La regla mental: si la app lo sirve, va a git; si es intermedio y regenerable,
no.

**Cruce por identificador estable, nunca por nombre.** Jugadores por
idJugador (licencia FEB), equipos por idClub/slug, acta↔boxscore por dorsal.
La FEB cambia el id de equipo cada año (con el patrocinador) y trunca nombres
de forma inconsistente, así que cruzar por nombre falla.

**Referencias a 40 minutos, no 36.** El baloncesto europeo usa 40 min como
referencia; el per-40 es el estándar correcto para esta plataforma.

**FT Rate con tiros libres intentados (intended).** Convención adoptada,
alineada con la convención extendida; reflejada en el cálculo, la leyenda y
los tooltips.

**El contexto por cuarto se desglosa restando cortes acumulados.** El acta da
el contexto acumulado hasta cada periodo; restando cortes consecutivos se
obtiene el de cada cuarto. Solo los campos sumables (contraataque, pintura, 2ª
oportunidad, tras pérdida, banquillo); máxima ventaja y mejor racha son
records, no se desglosan.

**Detección de cierre en diferencia absoluta, no porcentual.** El net rating
cruza el cero; el porcentaje relativo produce artefactos absurdos. Umbral ±6
puntos, validado sobre datos reales.

**El análisis narrativo solo en las vistas de análisis, no en la ficha de
partido.** La ficha de partido muestra datos limpios y resaltado objetivo (sin
prosa interpretativa). El análisis de equipo y el dossier sí generan frases
—es su propósito. Cada vista mantiene su estilo.

**No usar la API autenticada de la FEB.** Los datos ricos (shot charts con
coordenadas) están tras autenticación. Usarla sin permiso sería saltarse la
autenticación. La vía legítima —pedir acceso— está pendiente de respuesta. Los
shot charts quedan bloqueados hasta entonces, por decisión ética, no técnica.

**"Menos pero certero".** Principio recurrente: una detección robusta y
diferencial (el perfil de cierre) vale más que saturar el análisis con
lecturas de cada cuarto y métrica. Se resiste la tentación de generar mucho.

**Validar barato antes de invertir.** Repetidamente se validan umbrales, pace,
clutch y contexto sobre datos reales antes de escalar. Así se cazó el
artefacto del porcentaje y varios bugs antes de que llegaran a producción.

## 11. Gotchas y operativa

Los sustos reales y cómo evitarlos:

**actas-cuartos.js --forzar re-extrae TODO desde cero.** Sin --forzar, es
idempotente: salta las actas que ya existen y solo extrae las que faltan. Para
reanudar una extracción cortada, relanza sin --forzar.

**El script salta por "existe el fichero", no por "tiene contexto".**
Consecuencia real vivida: si una tanda vieja dejó actas sin el campo de
contexto, el script las cuenta como "ya existen" y no las re-extrae —quedan
incompletas silenciosamente. Solución: para reanudar tras un cambio en lo que
se extrae, borrar solo las actas incompletas (las que no tengan
contextoPorCuarto) y relanzar sin --forzar. Por eso existe el verificador.

**Verificar SIEMPRE antes de generar.** verificar-cuartos.js es el guardián:
comprueba cobertura, contexto, completitud y coherencia, y da veredicto
LISTO/NO. No fiarse del "1792 ya existían" del scraper —eso no garantiza que
tengan contexto. El verificador encontró una acta sin contexto en Primera que
se había colado en producción.

**Reanudar una extracción interrumpida** (receta completa): 1)
verificar-cuartos.js para ver cuántas están sin contexto; 2) borrar las
incompletas con un pequeño script que las detecte por ausencia de
contextoPorCuarto; 3) relanzar actas-cuartos.js sin --forzar (idealmente con
nohup ... & para que no se corte al tocar el terminal); 4) al terminar,
verificar de nuevo hasta que dé 0 sin contexto; 5) generar agregados y
boxscore.

**El portátil no debe suspenderse durante una extracción larga** (Tercera son
~3h desde cero): cortaría la red. nohup sobrevive a cerrar el terminal pero no
a la suspensión.

**Los ficheros de cuartos ya viven en data/processed/ como el resto** *(unificado
el 3/9/2026, ver §17.4)*. `calcular-cuartos.js` y `boxscore-cuartos.js` escriben
en `data/processed`; el `cp` del deploy los lleva a `web/public/data` y Vite a
`web/dist`. El `git add` del workflow volvió a ser `git add data/`. Un guardián en
`desplegar.yml` (`verificar-cuartos-desplegados.js`) comprueba, tras el build y
antes de publicar, que los cuartos están en `web/dist`: si faltan, el deploy falla
y el sitio se queda en la versión anterior en vez de publicarse sin cuartos.

**El primer run del workflow con cache vacía es seguro** gracias al guardián
(verificar && calcular): si faltan actas, no se genera y los datos versionados
quedan intactos. La cache se va poblando en runs sucesivos.

**`resumen-salud.js` en local miente sobre cobertura y huecos si la caché de
actas local está incompleta** *(31/10/2026)*. `data/raw/*/*/actas/` es
gitignored y solo vive completa en la caché de GitHub Actions — un checkout
local normal tiene cualquier subconjunto que haya quedado de sesiones
anteriores, no lo mismo que CI. Visto de verdad: corriendo
`resumen-salud.js` en local con solo 16 de las 43 actas de Primera 2026/27
que SÍ tiene CI, el check 3c ("partidos que la semana pasada tenían cuartos
ya no los tienen") disparó un falso crítico de 27-194 partidos por
categoría, y además **sobrescribió `cuartos-cobertura.json` con esa cifra
baja** (el script lo reescribe siempre, no solo en CI) — de haberse
commiteado, habría corrompido la base de comparación real. Si hace falta
correr `resumen-salud.js` en local para probar un cambio, revisar
`git diff data/processed/*/*/cuartos-cobertura.json` después y descartarlo
con `git checkout --` si no se ha corrido `actas-cuartos.js` localmente
sobre la temporada entera primero.

**Mantenimiento periódico:**
- Septiembre (nueva temporada): añadir "2026" a los temporadas.json de las tres categorías (se mantienen a mano, no se generan). Verificar que el workflow arranca bien con la temporada nueva.
- react-router-dom tiene un aviso de npm audit (GHSA-qwww-vcr4-c8h2) que NO afecta a esta app (es estática, sin servidor). NO ejecutar audit fix --force (rompería la API). Actualizar a >8.2.0 cuando haya parche.

## 12. Pendientes y roadmap

**Hecho:**
- Completar Tercera con el análisis por cuartos (extracción → agregados → boxscore → deploy). *(31/08/2026)*
- Estrenar y vigilar el workflow con cuartos en sus primeras ejecuciones reales: la actualización automática del 31/08/2026 ya regeneró los agregados de cuartos de Primera y Segunda sin incidencias. *(31/08/2026)*
- Comparador de equipos/jugadores lado a lado (toggle en la pestaña Comparador, ver sección 15). *(01/09/2026)*
- Unificar la ubicación de los ficheros de cuartos: llevados de `web/public/data/` a `data/processed/` como el resto, con guardián de deploy que verifica que llegan al build (§17.4). *(03/09/2026)*

**Prioridad media:**
- Servicio de generación de PDF "al vuelo" que evite las notas de cabecera/pie del navegador (la exportación actual del dossier usa `window.print()` con CSS de impresión, que no las evita).
- Índice propio (valoración sintética).

**Prioridad baja / a evaluar:**
- Ligas femeninas FEB (identificadas: g=4 LF Endesa grupo único, g=9/g=10 las de dos grupos; g=5-8 NO son nuevas, son vistas alternativas de Tercera). Esfuerzo ~2 tardes; la decisión es de demanda, no de viabilidad.
- Filiales en el registro de clubes (el campo existe, sin poblar).
- Shot charts con coordenadas — solo posibles vía la API autenticada; dependen de que la FEB responda a la solicitud de acceso.
- **Grasa: ~155 MB de datos duplicados en git** *(confirmado el 3/9/2026)*. 66 ficheros no-cuartos (equipos.json, jugadores.json, partidos.json, etc. de las tres categorías y temporadas) están versionados **a la vez** en `data/processed/` y en `web/public/data/`, con contenido idéntico (comprobado). El `cp` del deploy reconstruye la copia de public en cada build, así que la versionada en public es redundante. Candidato de limpieza para la off-season: dejar de versionar los no-cuartos en `web/public/data/` (gitignorarlos allí, ya que el deploy los regenera). NO mezclar con la unificación de cuartos —una limpieza y un cambio transversal juntos es justo lo que lo vuelve arriesgado—.

**Contexto de negocio** (a completar): el feedback de entrenadores contactados,
qué funcionalidades piden, y cómo priorizar según demanda real —eso vive fuera
del código y conviene anotarlo aquí cuando llegue.

---

## 13. Las fases finales en el análisis por cuartos (añadido)

Los partidos de fase (playoffs, ascensos, permanencia, finales) también tienen
análisis por cuartos, pero con un tratamiento **separado** de la liga regular,
por una razón de fondo: en las fases la muestra es de 1-6 partidos por
eliminatoria, demasiado pequeña para medias fiables, y mezclarlas con las ~30
de liga distorsionaría los agregados. Además, técnicamente son otra cosa (su
boxscore raw vive en data/raw/.../\_fases/, no en la ruta de liga).

**Criterio: "línea aparte".** El desglose por cuarto de cada partido de fase SÍ
se muestra en su ficha (boxscore y contexto por cuarto individuales), pero las
fases NO entran en los agregados de temporada (medias por cuarto, clutch,
perfil de cierre). Se ve cómo se jugó ese playoff cuarto a cuarto, sin que
contamine las medias de liga.

**Cómo se implementa:**
- `actas-cuartos.js --fases` — extrae las actas de fase (lee fases.json en vez de partidos.json). Sus actas van al mismo directorio de actas.
- `boxscore-cuartos.js` — no necesita flag: recorre TODO el directorio de actas, así que genera los boxscore de fase automáticamente (basta re-ejecutarlo tras extraer las fases).
- `calcular-cuartos.js` — separa sus dos salidas por fuente: los agregados solo con actas cuyo id está en partidos.json (liga); el contexto por partido (partidos-contexto.json) con todas (liga + fases). El filtro va ANTES de puenteDorsalId, porque las actas de fase no tienen boxscore raw en la ruta de liga y romperían el puente.

**Gotcha importante (aprendido en producción):** como `calcular-cuartos.js` y
`boxscore-cuartos.js` recorren el directorio de actas completo, en cuanto se
extraen las actas de fase, se cuelan en los agregados si no se filtra. Ocurrió
con Tercera: se desplegó con las fases contaminando las medias, y hubo que
corregir con el filtro por id de liga y regenerar. Regla: al añadir cualquier
acta que no sea de liga regular al directorio, revisar que los agregados la
excluyan.

## 14. Calidad de datos del contexto por cuarto (añadido)

El desglose del contexto por cuarto se hace restando cortes acumulados del PDF.
Esto puede producir valores imposibles en dos situaciones, ambas detectadas y
manejadas:

**Acumulados que decrecen (resta negativa).** Si el acumulado de un campo de
contexto es menor en un corte posterior que en uno anterior (errata del PDF de
la FEB, o corte mal alineado por devolver el partido completo repetido), la
resta da negativo. Imposible. `extraer-acta.js` marca ese campo como null en
vez de guardar el valor negativo. Detectado en 8 actas de Tercera (incluida una
marcada como completa y verificada — el error no siempre está en actas
truncadas).

**Valores inflados en actas truncadas.** En actas con huecos, la resta puede dar
un valor positivo pero imposible (ej. más puntos de pintura que puntos totales
del cuarto). No se corrige en origen porque esas actas ya están marcadas como
no fiables (verificado:false) y su contexto no se usa en la app.
`verificar-cuartos.js` solo exige coherencia del contexto en actas fiables
(completo && verificado), para no bloquear la generación por datos de actas que
ya se saben dudosas.

**El verificador demostró su valor** encontrando ambos tipos de problema antes
de que llegaran (o se quedaran) en producción: una acta sin contexto en Primera
que se había colado, y las 8 actas con contexto corrupto en Tercera. La lección:
verificar la coherencia de los datos, no solo su presencia; el mensaje de éxito
del scraper ("N ya existían") no garantiza que los datos sean correctos.

**Laguna permanente conocida — partido sin acta por cuartos.** El partido
`2487720` (Zentro Basket Madrid vs Uros de Rivas, Tercera grupo B-B, jornada 21,
07/03/2026, 81-62) se jugó de verdad —tiene boxscore raw completo— pero la FEB
**no publica su acta oficial en PDF**: el extractor responde "Sin cortes válidos
(acta no disponible)" (comprobado el 2/9/2026, dos intentos). Es la única acta que
falta en los 2.429 partidos jugados de la 2025/26; no es un fallo de extracción,
es que el documento no existe en la fuente. Queda sin datos por cuarto y la app lo
maneja como cualquier partido sin desglose. El resumen de salud (§17.5.4) no la
marca: su ventana `[10d, 60d]` deja fuera las lagunas históricas como esta.

### 13.1 Fichas de partido de fase (UI)

Los datos de fase (boxscore y contexto por cuarto) se generan igual que los de
liga, pero la ficha de partido necesitó trabajo de enrutado para mostrarlos,
porque los partidos de fase estaban tratados de forma distinta a los de liga:

- No están en partidos.json (viven en fases.json, anidados dentro de cada fase).
- Se abrian "por estado" (pasando el objeto partido desde el bracket), no por URL, asi que no recibian competicion/temporada y no se disparaba el fetch de contexto/boxscore por cuarto.
- Su estructura difiere: local/visitante son strings (el nombre), no objetos {id, nombre} como en liga. El resto (cuartos, boxscore) es identico.

Solucion (URL propia para partidos de fase):
- App.jsx carga fases.json a nivel de App (antes solo se cargaba dentro de Clasificacion.jsx).
- RutaPartido busca el partido en partidos.json y, si no, en fases.json (aplanando los partidos anidados), y normaliza los de fase: envuelve local/visitante en {nombre}, y arrastra el nombre de la fase (_fase) y el nº de jornadas (_njorn) para el titulo.
- verPartido navega por URL para liga y fases por igual (antes solo liga; fases iban por estado).
- Titulo segun formato de eliminatoria (derivado de _njorn): IDA/VUELTA si la fase tiene 2 jornadas (doble partido), PARTIDO UNICO si tiene 1, Jornada N si tiene 3+ (liguilla).

Resultado: los partidos de fase se abren como los de liga (URL compartible, boton atras), con su contexto y boxscore por cuarto. Los datos ya existian; faltaba el enrutado. Detectado porque el contexto no aparecia en las fichas de fase de ascenso pese a estar en los datos.

## 15. El comparador (jugadores y equipos)

Vista "Comparador" (pestaña propia) con un toggle jugadores/equipos
(ComparadorPanel.jsx envuelve Comparador.jsx y ComparadorEquipos.jsx).

**Comparador de jugadores** (Comparador.jsx):
- Carga bajo demanda los jugadores.json de las tres categorias (solo al entrar; ~9.5 MB, Tercera pesa 7 MB — optimizable a un fichero ligero si molesta).
- Filtros en cascada: categoria -> equipo -> nombre (no vuelca una categoria entera de golpe; espera equipo o busqueda).
- Seleccion acumulativa de hasta 4 jugadores (fichas quitables). Los elegidos persisten al cambiar de filtro, permitiendo comparar entre categorias.
- Tabla: cada metrica con valor crudo + percentil dentro de su categoria (percentil 'nac', ya calculado en jugadores.json). Resaltado del mejor por percentil.
- Radar de perfil superpuesto (6 ejes de percentil), un color por jugador.

**Comparador de equipos** (ComparadorEquipos.jsx):
- Igual patron, seleccion mas simple (categoria -> equipo; hay pocos equipos).
- Requirio generar percentiles de equipos por categoria en calcular.js (no existian; los jugadores si los tenian). Directos, sin invertir.
- Metricas 'menos es mejor' (drtg, puntos en contra, perdidas) marcadas con ↓: el resaltado y el radar las corrigen (100 - percentil) para que "mas es mejor" sea consistente, aunque el percentil guardado es directo.

**Comparacion entre categorias:** el percentil es la referencia justa (un 16 de puntos en Tercera no equivale a un 16 en Primera, pero P92 vs P85 si es comparable). Cuando se mezclan categorias, se avisa. El valor crudo se muestra igual, pero como dato descriptivo, no como juicio de calidad.

**Pendiente del comparador:** radar ya hecho para ambos; barras divergentes en las fichas de partido (para el enfrentamiento real de un partido; el grafico divergente implica "duelo", apropiado para un partido pero no para comparar medias de temporada). Optimizar la carga de jugadores (fichero ligero) si el peso de Tercera molesta.

## 16. Gotchas del pipeline descubiertos con el comparador

**La carpeta actas/ rompia calcular.js.** calcular.js recorre los subdirectorios
de data/raw/<comp>/<temp>/ asumiendo que todos son grupos de partidos. La
carpeta actas/ (creada para el analisis por cuartos) tiene otra estructura
(campos partido, local, porCuarto... sin equipoLocal) y rompia el parseo. No se
detecto durante semanas porque calcular.js no se re-ejecuto localmente desde que
se crearon las actas, y en el workflow del bot el fallo quedaba enmascarado por
continue-on-error (el bot seguia commiteando datos, potencialmente
desactualizados). Arreglado: calcular.js salta 'actas' y cualquier carpeta que
empiece por '_'. Leccion: al anadir cualquier carpeta a data/raw que no sea un
grupo de partidos, revisar que calcular.js (y similares que recorran el
directorio) la excluyan.

**Los percentiles de equipos van a data/processed, no a web/public/data.**
calcular.js escribe en data/processed; el deploy copia processed -> public. Al
generar los percentiles de equipos con calcular.js, quedaron en processed; para
probar en local (donde la app lee de public) hay que copiar processed -> public
manualmente. En produccion el deploy lo hace solo. *(Nota 3/9/2026: los cuartos,
que antes eran la excepcion generandose directamente en public, ya se generan
tambien en data/processed, §17.4. Ahora todo el pipeline escribe en processed y el
mismo cp del deploy lo sirve; el "copiar a mano para dev local" aplica por igual a
los cuartos.)*

## 17. El camino incremental y la transición de temporada (2/9/2026)

Sección escrita tras un ensayo de transición hecho en sandbox, antes del arranque
de la 2026/27. Su premisa es un hecho que conviene no olvidar: **este repo se creó
en julio de 2026, con las temporadas 2023/24, 2024/25 y 2025/26 ya cerradas y
cargadas hacia atrás. El pipeline nunca ha corrido contra una temporada en
curso.** Todo lo que sigue son caminos sin estrenar, no bugs observados.

### 17.1 El acta incompleta que nunca se re-extraía

> **Corregido el 2/9/2026** (`actas-cuartos.js`). Lo que sigue describe el
> problema —que se mantiene como registro— y, al final, el comportamiento actual.

Dos comportamientos razonables por separado que juntos formaban una trampa:

- `actas-cuartos.js` saltaba cualquier partido cuyo fichero ya existiera, **sin
  mirar si ese fichero era bueno**: no consultaba `completo`, ni `verificado`, ni
  `contextoPorCuarto`.
- El contador "N con avisos" del resumen solo contaba las actas extraídas en esa
  ejecución. Nunca las que ya estaban. Un "0 con avisos" podía convivir con
  actas rotas en disco.

De ahí salían dos fallos distintos, y el segundo es el más probable en septiembre:

**(a) Categoría congelada.** Si un acta quedaba escrita *sin* `contextoPorCuarto`,
`verificar-cuartos.js` sale 1 cada semana, el `&&` corta la generación, y los
cuartos de esa categoría se quedan clavados en la última generación buena
mientras `partidos.json` avanza. Como el bloque va con `continue-on-error`, el
workflow sale **verde**. Históricamente este caso vino de un cambio de esquema
(el contexto se añadió después), no de la FEB. Nota medida el 2/9/2026: de las 33
actas rotas que hoy hay en disco, **ninguna carece de contexto** (todas son
truncadas con `completo:false`), así que este caso (a) no existe ahora mismo en
producción; el que importa hoy es el (b).

**(b) Datos parciales dados por buenos —el escenario realista.** Un partido del
domingo cuya acta la FEB aún no ha cerrado no llega sin contexto: llega
**truncada** (`completo:false`). Y las truncadas el verificador las tolera
explícitamente: dice LISTO y genera. Ese fichero no se volvía a tocar jamás,
aunque la FEB completara el PDF el martes. Resultado: los cuartos de ese partido
quedaban mal para siempre, sin alarma de ningún tipo. Datos silenciosamente
incorrectos son peor que un pipeline parado, porque un pipeline parado se acaba
notando.

**Comportamiento actual.** `actas-cuartos.js` salta un partido solo si su acta
está **sana** (`completo && verificado !== false && contextoPorCuarto`) —la misma
condición que usa el verificador—. Una acta rota se re-extrae, y si sigue rota
tras extraerla bien se apunta un `intentos` en el propio fichero; al llegar a 4
se rinde y deja de reintentarse (las ~33 truncadas que la FEB no completará no se
reintentan eternamente). Cuando una re-extracción la deja sana, el campo
`intentos` se borra. **Un fallo de red o un PDF inaccesible NO consume intento**
(la asimetría es deliberada: reintentar un PDF inalcanzable cuesta una petición
semanal; rendirse por un fallo transitorio dejaría un agujero permanente); solo
se anota un `fallosRed` aparte, informativo, que no cuenta para rendirse. El
resumen final cuenta las actas rotas **en disco**, no solo las tocadas en esa
ejecución, y lista los ids de las rendidas para alimentar el resumen de salud del
punto 4 de §17.5.

Complemento imprescindible en `verificar-cuartos.js` (2/9/2026): una acta
**rendida** (`intentos >= 4`) se trata como una truncada —se reporta en su propia
línea y **no** cuenta en `sinContexto` ni bloquea la generación—. Sin esto, una
rendida sin contexto contaría como acta sin contexto, el verificador saldría 1
cada semana y congelaría los cuartos de toda la categoría para siempre: exactamente
el caso (a) que este arreglo venía a cerrar. La condición de bloqueo sigue intacta
para las actas no rendidas: una que pierda el contexto y aún tenga intentos por
gastar sí bloquea, porque se puede y se debe re-extraer.

### 17.2 La temporada no cambia sola

`temporada-actual.js` prefiere el `selected` del desplegable de la FEB sobre el
máximo. Calcula `discrepancia`, pero **nadie actúa sobre ese campo**: en
`scrape.js` es solo un `console.log`. A 2/9/2026 las tres categorías están ya en
discrepancia (seleccionada 2025 = 2025/26, máxima 2026).

Si la FEB no mueve el `selected` a 2026 al arrancar la liga, el lunes siguiente a
la jornada 1: los nueve pasos corren sobre una temporada cerrada y no encuentran
nada; `estado.json` se reescribe con `temporada: "2025"` y un `actualizado`
fresco, así que **la app anuncia "actualizado hoy" mostrando una temporada
terminada**; los cuartos regeneran 2025; y no hay un solo error en ningún sitio.

Corolario para `refrescar-calendario.js`: su comentario justifica que es barato
porque "no hay actas, solo baja los _indice.json". Esa premisa **caduca en la
jornada 1**: a partir de ahí descarga boxscores reales de 2026 a 1.200 ms por
petición, bajo `continue-on-error`, acumulando raw en `data/raw/*/2026/` que
nadie procesa. No corrompe el estado (la temporada va forzada por parámetro, así
que no escribe `estado.json`), pero es trabajo desperdiciado e invisible.

**Limitación conocida del canario (`comprobar-temporada.js`).** Captura el fallo
de `detectar()` por categoría y la omite —su trabajo es la discrepancia, no la
disponibilidad de la FEB—. Consecuencia no obvia: **si la detección falla en las
tres categorías, el canario pasa en verde sin haber comprobado nada**. En la
ventana de transición de temporada es un hueco silencioso. Se acepta a sabiendas:
el riesgo real es bajo (un run perdido, y el canario ya tiene ~1 semana de
latencia por diseño al leer los índices de la ejecución anterior). Si alguna vez
se quiere cerrar, el sitio **no** es el canario sino `resumen-salud.js`: que avise
cuando el canario no pudo evaluar ninguna categoría. (El canario, además, ya no
puede *colgarse* en `detectar()`: se le añadió timeout y reintentos el 3/9/2026
tras verlo colgar el workflow entero en la primera ejecución real — §17.4.)

### 17.3 Inventario de fallos que hoy no pueden ponerse rojos

| Sitio | Comportamiento |
|---|---|
| `scrape.js`, última línea | `main().catch(err => console.error(...))` sin `process.exit(1)`: cualquier excepción no capturada sale con código 0. |
| `scrape.js`, detección | Si `detectar()` falla, cae a `TEMPORADA_DEFECTO` y sigue. Un cambio de HTML en la FEB deja el scraper trabajando sobre 2025 el resto de la temporada. |
| `actas-cuartos.js` | El IIFE async no tiene `.catch` ni `process.exit`. El 100% de actas fallidas sigue saliendo 0. |
| `scrape.js`, grupos vacíos | Razona sobre si estamos en temporada, pero solo imprime. |
| workflow, bloques de cuartos | `continue-on-error: true`. |

La ironía: el único script que sabe decir "no" es `verificar-cuartos.js` (exit 1),
y es precisamente el que va envuelto en `continue-on-error`.

**El principio que falta:** separar "no hay datos nuevos" (normal, silencioso) de
"no he podido trabajar" (anómalo, ruidoso). Hoy los dos se ven igual.

### 17.4 Otros hallazgos

- **Las actas ya no viven solo en la cache de Actions** ✅ *(resuelto el 2/9/2026)*.
  Eran 100 MB gitignored sin copia persistente; la cache caduca a los 7 días y el
  cron es semanal, así que estábamos a un lunes fallido de perderlas (reconstruir
  en frío ≈ 4 h contra la FEB). Ahora se respaldan como **release assets** (tag
  dedicado `actas-cache`, un `tar.gz` por categoría y temporada) mediante
  `scraper/actas-release.sh`. Los artifacts se descartaron porque **caducan** (máx.
  90 días): no son copia persistente; un release asset no caduca. El workflow
  restaura en orden **cache → release → FEB** (paso "Asegurar actas") con una línea
  de log inequívoca, y sube la temporada en curso al final ("Publicar actas"). Sin
  manifest a propósito: la cache es todo-o-nada, así que la regla de restauración es
  simple —si el directorio de actas de la temporada está vacío o no existe, restaurar
  del release; si está, usarlo—. La línea distingue cuatro estados y el caer al
  camino lento por un motivo normal del que merece atención: `ACTAS: CACHE`,
  `ACTAS: RELEASE`, `ACTAS: FEB (temporada nueva, normal)` —al arrancar una temporada
  aún no hay tarball suyo, esperado— y `ACTAS: FEB (respaldo ausente o roto)` —lo
  único que pide mirar—. La clasificación se decide comprobando la **existencia** del
  release y del asset concreto (`gh release view --json assets`), no grepeando el
  texto del mensaje de gh (que depende del idioma). Detalle y criterio en
  `_informe-persistir-actas.md`. El repo es público (verificado) y las
  actas derivan de PDF públicos de la FEB, así que publicarlas no expone nada.
  Escala barato: git no crece (nunca se versionan), y el release suma ~100 MB por
  temporada, que en repo público es gratis.
- **El commit del workflow es resistente a concurrencia** ✅ *(3/9/2026)*. El paso
  "Commit y push" hacía `git push` a pelo: si el remoto había avanzado entre el
  checkout y el push, salía `[rejected] (fetch first)` y el run moría (visto de
  verdad al solapar dos ejecuciones manuales, y le pasaría igual a un push de
  Alexandre desde el portátil mientras corre el cron). Ahora, **dos piezas**: (1)
  un bloque `concurrency: { group: actualizar-datos, cancel-in-progress: false }`
  que serializa las ejecuciones de este workflow entre sí (un dispatch espera al
  cron, no lo mata); y (2) en el paso de commit, si el `push` es rechazado se hace
  `git pull --rebase origin main` y se reintenta (hasta 3 veces). El `concurrency`
  solo cubre choques de este workflow consigo mismo; el rebase cubre el caso real
  de un push humano concurrente. Bot (datos) y humano (docs/scripts) casi nunca
  tocan los mismos ficheros, así que el rebase se resuelve solo; un conflicto
  **real** en datos deja el rebase a medias y el paso sale con código 1 —falla
  ruidosamente, que es lo que merece que una persona lo mire—.
- **Los ficheros de cuartos ya viven en data/processed** ✅ *(3/9/2026)*. Eran la
  única cosa que se generaba directamente en `web/public/data/` (el resto va a
  `data/processed/` y el `cp` del deploy lo sirve); si el deploy pasara a
  `rsync --delete`, los cuartos desaparecerían. Ahora `calcular-cuartos.js` y
  `boxscore-cuartos.js` escriben en `data/processed/`, el `git add` del workflow
  volvió a `git add data/`, y el `cp` del deploy los lleva a `web/public/data` →
  Vite → `web/dist` como el resto. El guardián de este cambio **no** vive en
  `resumen-salud.js` (corre en `actualizar-datos`, antes del deploy, mirando
  `web/public/data` —un proxy que el movimiento invalidaba—) sino en
  `desplegar.yml`: `verificar-cuartos-desplegados.js` comprueba, tras el build y
  antes de publicar, que los cuartos están en `web/dist` (que es el mismo antes y
  después del movimiento). Si faltan, el deploy falla y el sitio se queda en la
  versión anterior: rotura silenciosa → deploy rojo. Verificado de punta a punta
  en CI (deploy verde con los cuartos servidos desde `data/processed`). Detalle en
  `_informe-guardian-deploy.md`. Pendiente relacionado (§12): ~155 MB de no-cuartos
  duplicados en git, limpieza de off-season, sin mezclar con esto.
- **La semana en blanco ya se distingue en el historial** ✅ *(3/9/2026)*.
  `estado.json` reescribe sus timestamps (y `calendarios`) en cada ejecución, así
  que `git diff --staged --quiet` no se cumple nunca y todos los commits salían
  iguales. No se podía tocar el timestamp (la app usa `estado.actualizado` para la
  fecha de datos) ni dejar de commitear `estado.json` (`resumen-salud.js` lee
  `estado.calendarios` para la frescura de índices). Solución: el commit se sigue
  haciendo, pero el **mensaje** distingue —si lo único que cambió es
  `data/processed/estado.json`, es "Sin datos nuevos, solo estado (fecha)"; si
  hay ficheros de datos, "Actualización automática de datos (fecha)"—. El check es
  portable (`grep -v … | grep -q .`, no `grep -qv`, que difiere entre GNU y BSD).

### 17.5 Orden de arreglo acordado

**Completo (2/9/2026): los cuatro puntos están hechos.**

1. ✅ **Hecho (2/9/2026).** La condición de "acta sana" en `actas-cuartos.js`
   (§17.1), con contador de `intentos` (se rinde a los 4), `fallosRed` aparte para
   los fallos de red, y resumen que cuenta las rotas en disco y lista las rendidas.
   Complementado en `verificar-cuartos.js`: las rendidas no bloquean (§17.1).
2. ✅ **Hecho (2/9/2026).** El canario de transición de temporada (§17.2):
   `scraper/comprobar-temporada.js`, primer paso del workflow y **sin**
   `continue-on-error` (va el primero para que un arranque mal detectado no
   reescriba `estado.json` con un "actualizado hoy" falso). **No dispara por el
   mes** —eso paralizaría la actualización semanal durante semanas de pretemporada
   con todo sano—: falla solo cuando la temporada máxima **ya tiene partidos
   jugados** (los detecta en los `_indice.json` que baja `refrescar-calendario.js`)
   y la FEB sigue seleccionando la anterior. Una discrepancia sin partidos aún es
   pretemporada normal: informa, no falla. Caveat: los índices son los de la
   ejecución anterior, así que el canario puede tardar hasta una semana en
   dispararse tras el primer partido —margen aceptable y del lado seguro—. Cuando
   la FEB mueva su selector, la discrepancia desaparece y pasa a verde solo.
   Verificado en local: hoy 2/9/2026 pasa (0 jugados en la 2026), y dispara en
   cuanto un índice de la máxima trae un marcador.
3. ✅ **Hecho (2/9/2026).** Códigos de salida honestos (§17.3): `scrape.js` sale 1
   ante cualquier excepción no capturada (antes salía 0). `actas-cuartos.js` sale 1
   solo si el fallo es **sistémico** (`errores > 0 && procesados === 0`): un goteo
   de PDF caídos con extracciones que sí funcionaron no falla, porque se reintentan
   la semana siguiente. Verificado con stub: fallo total → 1, éxito → 0.
4. ✅ **Hecho (2/9/2026).** `scraper/resumen-salud.js`, último paso del workflow y
   **sin** `continue-on-error`. Corre **después** del commit/push: es una alarma,
   no un guardián —los datos ya se publicaron; ponerse rojo avisa de un problema
   meta sin retener datos válidos—. Falla solo por lo **crítico**: una categoría
   con los cuartos bloqueados (re-ejecuta `verificar-cuartos.js`), un grupo sin
   partidos en la temporada seleccionada **ya rodada** (ver más abajo), los índices
   de la temporada máxima obsoletos (el canario quedaría ciego), o **un acta que
   falta para un partido jugado hace más de 10 días** (ver punto ciego más abajo).
   **Avisa** sin fallar de: actas nuevas rendidas, errores de extracción del run, y
   grupos vacíos en el arranque de temporada. Escribe también a
   `GITHUB_STEP_SUMMARY`. Los bloques de cuartos siguen tolerantes; aquí se juzga.

   **Grupo vacío: crítico solo con la temporada ya rodada.** La FEB publica los
   calendarios de los grupos de forma escalonada en las primeras semanas, así que
   en septiembre habrá índices vacíos legítimos; marcarlos críticos pondría el
   workflow en rojo cada lunes justo cuando más falta hace leer señales reales.
   Discriminante: la fecha del primer partido de la temporada (en los
   `_indice.json`); si arrancó hace ≤42 días (~6 semanas), un grupo vacío es aviso;
   ya rodada, sigue siendo crítico (scraper roto).

   **Punto ciego cerrado — acta que falta para un partido jugado.** Si
   `actas-cuartos.js` fallaba del todo en una categoría, no había señal en ningún
   sitio: el verificador da LISTO porque tolera las actas que faltan, y el reporte
   del run (`cuartos-run`) ni existe si el script no llegó a correr. Los cuartos se
   quedaban atrás en silencio. El resumen cruza ahora los `_indice.json` (que traen
   fecha y resultado de cada partido) con la carpeta de actas: un partido jugado
   hace más de 10 días sin acta = crítico. Por debajo del umbral es el retraso
   normal con que la FEB cierra las actas. Se excluyen las incomparecencias
   (`excluidos.json`): llevan marcador nominal pero no tienen acta ni la tendrán.
   Las fechas viven en los `_indice.json`, no en el `partidos.json` procesado.

   Dos piezas que lo alimentan: `actas-cuartos.js` deja un reporte efímero del run
   en `data/processed/cuartos-run-<comp>.json` (gitignored) con las rendidas nuevas
   y los errores; y `refrescar-calendario.js` sella en `estado.json`
   (`calendarios[cat] = {temporada, actualizado}`) cuándo refrescó por última vez
   los índices de la temporada futura, y borra la marca cuando ya no hay futuro que
   seguir. El resumen mide la frescura por esa marca, **no** por la fecha de commit
   de los índices: en pretemporada esos índices no cambian de contenido durante
   semanas aunque `refrescar` corra bien, así que la fecha de commit daría un falso
   "obsoleto"; la marca de proceso es la señal correcta.

Clasificación de "actas nuevas rendidas" como aviso (no crítico): una laguna
permanente de un partido suelto es para enterarse, no para retener la
actualización de toda la categoría —sería el mismo sobre-bloqueo que se quitó del
canario en §17.2—. Si conviene, subirla a crítico es un cambio de una línea.

Con esto §17.5 queda cerrado. Lo de §17.4 (unificar la ubicación de los ficheros
de cuartos, y el commit vacío que nunca lo está) sigue pendiente pero no es de
transición; puede esperar al arranque.

### 17.6 El jugador que desaparece, y el verificador que no verificaba nada *(27/9/2026)*

Construyendo `scraper/huella-acta.js` (fingerprint estructural del acta, para el
cambio de reglamento FIBA del 1/10 — ver §2ª parte de este documento si existe, o
`_informe-huella-acta.md`) apareció un bug real, de tres temporadas de antigüedad,
en `extraer-acta.js`: **`parseJugador` exige el ancla `MM:SS` en la misma línea que
el dorsal**, y cuando el PDF envuelve un nombre largo en dos líneas de texto plano
(a veces con una letra suelta de por medio, resto de un acento partido: "Í", "É"),
la fila no coincide nunca con el regex y **se descarta en silencio** — sin error,
sin log. Si los totales de equipo se calculan sumando filas de jugador, un jugador
perdido deja al equipo con menos puntos, menos minutos y menos rebotes de los que
tuvo de verdad: contamina posesiones, ORtg, eFG y todo lo que cuelgue de ahí, para
ESE partido, sin ninguna señal.

**Alcance medido sin red** (sumando primero puntos de `porCuarto` contra el
marcador —un suelo, no ve a un jugador de 0 puntos—, luego minutos del cuarto 1
contra 50:00 —FIBA, 5 en pista × 10 min, no depende de prórrogas—, unión de los
dos métodos): **534 de 2537 partidos de las tres temporadas cerradas** (Primera 25,
Segunda 85, Tercera 424) tienen al menos una fila de jugador perdida. Lista con la
metodología completa en `test/partidos-cuartos-incompletos.json`.

**Arreglo (`extraer-acta.js`):** `parseTexto` une la línea del dorsal con las
siguientes hasta encontrar el ancla `MM:SS`, descartando fragmentos sueltos de una
sola letra, con tope de 3 líneas de margen. Verificado contra el caso real
(partido 2535727, Ángel Comendador): aparece limpio y el equipo pasa de 11 a 12
jugadores.

**El guardián que hacía falta, `verificarActa` (mismo fichero):** sumar los
minutos de cada equipo y compararlos con `200:00 + 25:00 × nº de prórrogas` (las
prórrogas se deducen de `parciales.length`) es un invariante del reglamento, no
una suposición — un jugador perdido siempre lo rompe, tenga los puntos que tenga.
Lanza si no cuadra, o si queda alguna fila con pinta de jugador que ni uniendo
líneas se ha entendido. **Bloquea, no solo avisa**, porque quien lo llama en
producción (`actas-cuartos.js`) ya aísla los fallos por partido y reintenta la
semana siguiente (§17.1): no hacía falta red de seguridad nueva, y el cron semanal
(`actualizar-datos.yml`) no llama a `extraer-acta.js` en absoluto, así que esto no
interactúa con el despliegue de datos en vivo.

Para que el invariante se pudiera aplicar sumando los 4 cuartos (no solo el
cuarto 1), `extraerActaPorCuartos` tuvo que dejar de perder el campo `min` en los
cuartos 2-4: `difJug()` construía esas filas a mano y no lo copiaba. **Corregido
diferenciándolo, no copiándolo tal cual** — `min` es acumulado igual que `pts` (el
corte trae los minutos HASTA ese corte), así que copiarlo sin diferenciar habría
dejado el acumulado en vez del cuarto suelto y la suma de los 4 no habría dado el
total.

**Un segundo fallo de la misma familia, y más serio: `∶` no es `:`.** El partido
2484716 tenía `porCuarto` vacío de las cuatro entradas — ni una fila de jugador
reconocida — porque su PDF usa el homoglifo Unicode U+2236 (RATIO) en vez de
U+003A (dos puntos ASCII) en todo el `MM:SS`. Unir líneas no lo arregla: no hay
ningún `:` que encontrar por mucho que se junten. **Arreglado normalizando la
familia de homoglifos** (RATIO, MODIFIER LETTER COLON U+A789, FULLWIDTH U+FF1A) a
`:` en una sola pasada sobre el texto extraído, no añadiendo el carácter concreto
al regex — si una fuente no garantiza ASCII, el problema no es el carácter que ya
se ha visto, es el siguiente que aún no.

**Y el hallazgo que pesa más que los dos bugs juntos:** `verificar-cuartos.js`
—el guardián pensado precisamente para cazar actas incompletas— dejaba pasar un
acta con `porCuarto` vacío de principio a fin. `contextoPorCuarto` existía (se
parsea por etiqueta de texto — "Máxima ventaja", "Puntos 2ª oportunidad" — y no
depende de ningún `:`, así que sale sano aunque no haya ni un jugador). Y
`verificado` en `actas-cuartos.js` salía de un `forEach` sobre `acta.final.equipos`
que, con `equipos: []`, **no itera nunca**: `cuadra` se quedaba en su `true`
inicial sin que nadie lo pusiera a prueba. **Un acta vacía "verifica" por
omisión.**

> **Regla general, tercera vez que aparece esta forma exacta** (antes: el canario
> de temporada afirmando salud sin haberla comprobado, §17.2; `verificar-cinta.cjs`
> pudiendo pasar en verde sin comparar nada, `desplegar.yml`): **un verificador que
> recorre una colección tiene que afirmar primero que la colección no está vacía.
> Un bucle sobre una lista vacía no falla — aprueba.**

Arreglado reusando `verificarActa` desde `verificar-cuartos.js` (con
`equiposDesdePorCuarto`, que reconstruye los minutos por jugador desde la caché ya
en disco sin volver a pedir el PDF) en vez de un `some(...)` suelto: caza el acta
vacía *y* la de minutos descuadrados con la misma llamada, un guardián menos que
mantener en dos sitios. Medido antes de encenderlo: de las 2537 actas cacheadas,
solo 3 eran medibles con el código de hoy (casi toda la caché es de antes de este
arreglo y no tiene `min` en los cuartos 2-4), y las 3 fallan — los 3 casos ya
conocidos, cero falsos positivos. **Bloquea el veredicto** *(28/9/2026)*.

**El acta deja de tratarse como infalible.** El partido 2484716 llevó a comprobar
si sus propios parciales sumaban su propio marcador — y en la copia cacheada
original (extraída meses atrás, con el campo `parciales` que no depende de ningún
`:` y por tanto nunca sufrió el bug del homoglifo) **sí sumaban**: 4 cuartos
completos, coherentes con el resultado final. La FEB, en este caso, publicó bien.
Pero **volver a pedir ese mismo PDF hoy, ya con el homoglifo arreglado, devolvió
solo 3 cuartos** — la misma degradación de "re-pedir un partido viejo al sitio en
vivo puede traer menos datos de los que trajo en su día" ya vista en 2486858, no
un defecto nuevo del PDF original. Conclusión operativa: **los invariantes
(minutos, suma de parciales contra marcador) se comprueban siempre, nunca se
asume que el acta —ni la copia recién bajada— es correcta por venir de la FEB.**

**Registro de "cuartos incompletos en origen"** (mismo idiom que `excluidos.json`:
declarar el hueco con su motivo, no dejarlo en silencio ni bloquear para siempre
algo que nunca va a cuadrar): `data/processed/<comp>/2025/cuartos-incompletos-origen.json`.
Dos partidos confirmados con la copia cacheada **original**, no con un re-fetch
(1 solo cuarto/parcial, coincide con el marcador — la FEB solo publicó ese
cuarto): `2513268` (primerafeb) y `2486938` (segundafeb). `2484716` **no** entra
aquí — su origen era bueno (4 parciales, cuadran); queda pendiente de la
re-extracción en paralelo de la semana del 5/10 (ver más abajo), no de un defecto
de origen. `verificar-cuartos.js` excluye estos IDs del bloqueo para que dejen de
contar como fallo cada semana sin dejar de estar declarados.

**Re-extracción histórica, aprobada, no ejecutada todavía** (noche del 6/10, tras
la prueba de carga del 5/10 con 90 partidos — no pedir dos cosas grandes a la FEB
el mismo día): re-extraer a una carpeta paralela, nunca sobre la caché existente
—precisamente por lo que enseñó 2486858/2484716—, y por partido: `verificarActa`
primero (si la nueva pasa y la vieja no, gana la nueva); si empatan pasando o
fallando, gana la de más `parciales.length` (más cuartos es estrictamente más
dato). Reanudable (la carpeta paralela como punto de control) y con informe del
reparto (cuántos promueven, cuántos se quedan, cuántos van al registro de
incompletos en origen) — sin eso se sabe que la pasada terminó, no qué hizo.
Disco: ~200 MB de pico (100 MB actuales + 100 MB de la copia nueva). Tiempo:
~4-5 h a la pausa de 1,2 s habitual.

Detalle completo, con lo verificado separado de lo deducido en cada paso:
`_informe-jugador-perdido.md`, `_informe-alcance-real.md`, `_informe-dos-fallos.md`,
`_informe-homoglifos-y-guardian.md`.

### 17.7 El sitio congelado doce días: el interbloqueo de `web/public/data` *(11/10/2026)*

El 5/10 el despliegue empezó a fallar en "Verificar que el build lleva los
cuartos" (`verificar-cuartos-desplegados.js`, §17.4) y **siguió fallando doce
días**: `pickandstats.es` sirvió datos del 29/9 hasta el 11/10, con dos issues
abiertas por el vigilante (§17.6) — la primera vez que esa alarma mordía, y
mordió en lo correcto. Diagnóstico leyendo el log real (`conclusion` vía
`gh run view --json`, nunca el listado web — ver más abajo por qué) antes de
tocar nada: el guardián **tenía razón**, no era un falso positivo. Medido
contra `data/raw/.../actas` directamente, no contra ningún resumen de script:
Primera llevaba congelada en 9 de 18 partidos desde un arreglo manual del
29/9; Segunda y Tercera estaban en **cero** cuartos pese a 13 y 56 partidos
jugados.

**La causa de la causa es un interbloqueo real**, no una coincidencia de mal
momento: `actas-cuartos.js` lee la lista de partidos de
`web/public/data/<comp>/<temp>/partidos.json`, que solo se refresca cuando un
deploy termina bien (su `cp -r data/processed/. web/public/data/`). Sin ese
refresco no hay cuartos nuevos que generar; sin cuartos nuevos el guardián
bloquea el deploy; sin deploy no se refresca `partidos.json`. El círculo se
cierra solo y **no se abre por sí mismo** — por eso "esperar al lunes" no
sirve: cada semana sin intervención el agujero crece, no se cierra. Nunca se
había visto porque hasta esta racha siempre había un deploy reciente de por
medio manteniendo `web/public/data` al día. De propina, el mismo patrón tenía
`jugadores-comparador.json` ausente del build en las **nueve** combinaciones
de temporada cerrada (las tres competiciones × 2023/24/25): se añadió al
pipeline después de la última sincronización completa de `web/public/data`.

**Arreglo, sin tocar el guardián** (deliberado: una decisión de producto —qué
es peor, publicar sin cuartos de la jornada nueva o tener el sitio congelado—
no le toca a quien solo estaba de guardia): generar los cuartos que faltaban
para las tres competiciones 2026 (18/18, 13/13, 53/56 — los 3 restantes son
errores de extracción puntuales que se reintentan solos) y sincronizar
`web/public/data` entero desde `data/processed`, no solo 2026 (2762 ficheros).
Verificado con el guardián real reconstruyendo `web/dist` y corriendo
`verificar-cuartos-desplegados.js` a mano, no leyendo código. Deploy verde,
confirmado por el campo `conclusion`, no por el texto del listado. Vigilante
corrido a mano para cerrar las dos issues en vez de esperar a su ejecución
programada.

**El interbloqueo en sí sigue sin resolver estructuralmente** — esto fue un
desatasco manual, igual que el del 29/9, no un arreglo de raíz. La raíz
(`actas-cuartos.js` debería leer de `data/processed`, que siempre está al
día, no de `web/public/data`, que solo lo está si el deploy anterior salió
bien) queda pendiente. Si el deploy vuelve a fallar una semana o más por
cualquier otro motivo, el mismo círculo puede repetirse.

**Dos afirmaciones propias que resultaron falsas, por la misma causa raíz —
leer un listado en vez del campo `conclusion`:** "el estreno del 28/9 salió
bien" (el run #18 estaba en rojo; se leyó la duración del listado HTML, que
no lleva el estado al texto) y "cero ejecuciones fallidas en la historia del
repo" (un filtro `is:failure` devolvió 0 un día y 13 tres días después, sin
que hubiera cambiado nada salvo la vista). **Regla fijada: para saber si un
run fue bien, se lee `conclusion` — `gh run list --json conclusion,status,...`
o el run por API — nunca un listado ni un filtro de la web.**

**La reparación en paralelo, aprobada el 27/9, construida y lanzada hoy**:
`scraper/reparar-cuartos-historicos.js` re-extrae cada partido de las tres
temporadas cerradas a `data/raw-reparado/` (nunca sobre `data/raw/.../actas`
directamente), decide con la regla ya validada contra el caso que la motivó
(2486858: `verificarActa` primero, empate → gana `parciales.length` mayor,
empate total → se queda la vieja) y es reanudable por partido. Requirió un
cambio mínimo y retrocompatible en `extraerActaPorCuartos`: acepta
`{ verificar: false }` (por defecto sigue en `true` en todo el resto del
pipeline) para poder comparar una extracción nueva que no pasa `verificarActa`
en vez de perderla en una excepción. Promover de verdad (copiar la carpeta
paralela sobre `data/raw`) queda como paso aparte, tras revisar el reparto —
no se promociona a ciegas ni con la regla ya aprobada.

Detalle completo: `_informe-doce-dias.md`.

### 17.15 El acta que no verifica no es lo mismo que el acta que no existe *(31/10/2026)*

**Nota de numeración**: el código tiene comentarios que citan `S17.8` a
`S17.14` (`calcular.js`, `resumen-salud.js`, `verificar-cuartos.js`,
`generar-registro-irreparables.js`, `vigilante.js`, `boxscore-cuartos.js`,
`scrape.js`) para los que **no existe sección aquí** — se documentaron en
código pero nunca llegaron a este fichero. No se reconstruyen hoy (no es el
trabajo de este lote y haría falta reconstruir el contexto de cada uno desde
cero); queda como hueco conocido. Esta entrada usa `17.15` para no chocar con
ninguno de los números ya citados, no porque `17.8`-`17.14` existan.

Hasta hoy, cuando `actas-cuartos.js` descargaba y parseaba un PDF pero
`verificarActa` fallaba (minutos de un equipo que no suman 200:00 + prórrogas),
**no se escribía nada** — ni en `data/raw/.../actas` ni en ningún otro sitio.
Aguas abajo (`resumen-salud.js`) esto era indistinguible de "la FEB no ha
publicado el acta todavía": las dos situaciones se ven igual, un fichero que
no existe. Pero son dos problemas de naturaleza distinta — uno lo arregla el
tiempo, el otro no — y uno de los dos tenía evidencia que valía la pena
guardar en el momento en que ocurre, no reconstruir después.

**Arreglo**: `verificarActa` (`extraer-acta.js`) ahora adjunta al error que
lanza `err.tipoFallo = 'verificacion'` y `err.evidencia` (lado que falla,
minutos obtenidos/esperados, filas de jugador por equipo, y el `http`/`bytes`
de la descarga que sí funcionó — capturados en `pedirCorte` incluso en el
camino feliz, no solo al fallar). `actas-cuartos.js` distingue este caso del
fallo de red/PDF-inaccesible (que sigue sin consumir intento, igual que
antes) y lo registra con esa evidencia en
`data/processed/<comp>/<temp>/actas-no-verificadas.json` — generado, nunca a
mano, y **autolimpiable**: solo se toca la entrada de un partido cuando ese
run lo intenta de verdad, y se borra sola en cuanto un intento pasa
`verificarActa`. Mismo idioma que `cuartos-incompletos-origen.json` y
`actas-irreparables-origen.json`.

**Política de reintento** (mismo punto del lote): sin esto, cada run semanal
volvería a pedir 4-8 PDFs a la FEB por cada acta de este registro, para
siempre — no hay ningún campo "intentos" en disco que las frene (nunca se
escribe fichero para ellas). Tras 2 intentos fallidos (`UMBRAL_CONOCIDA`) se
consideran persistentes y pasan a reintentarse cada 14 días
(`RETRY_DIAS_CONOCIDA`), no cada run. **No toca `DIAS_ACTA`/`DIAS_ACTA_TOPE`**
de `resumen-salud.js` a propósito — ese suelo es sobre cuándo avisar de un
hueco, esto es sobre cuánto se gasta reintentando; un run que no reintenta
una entrada conocida sigue contándola como fallo igual.

`resumen-salud.js` separa el aviso único que había en dos: "N acta(s) que la
FEB no sirve todavía (jugados hace X-Y días)" para las que de verdad faltan,
y "M acta(s) que extraemos y no cuadran" (señalando el registro) para las que
están en `actas-no-verificadas.json`.

Verificado con datos reales (no solo con el test): las 6 actas señaladas el
31/10 (`2537028`, `2528248`, `2535739`, `2535735`, `2536844`, `2536117`)
todas lanzan `tipoFallo: 'verificacion'` con evidencia completa; probado en
sandbox (`data/processed/tercerafeb/_test31oct`, limpiado tras la prueba) que
el registro escribe, acumula `intentos` y se autolimpia como se espera.
`test/regresion.cjs` y `verificar-cuartos.js` sobre datos reales, sin
cambios. Detalle de la investigación de las 6 actas, `_informe-seis-actas.md`.

### 17.16 Publicar con un agujero honesto, no esconder el partido entero *(31/10/2026)*

Tres de las seis actas del §17.15 (y otras tres encontradas después, siete
en total) tienen los puntos perfectos cuarto a cuarto contra la fuente
oficial — solo fallan en la suma de MINUTOS de un equipo. Hasta hoy eso
bastaba para que `actas-cuartos.js` no escribiera nada: la excepción de
`verificarActa` cortaba antes de llegar al fichero. El lector veía un
partido sin ningún desglose, igual que si la FEB no hubiera publicado el
acta — un agujero de dato donde en realidad había un dato bueno con una sola
columna defectuosa.

**Arreglo**: `extraerActaPorCuartos` se llama con `{ verificar: false }`
(precedente: la reparación en paralelo del §17.7). `verificarActa` se
comprueba luego A MANO, sin bloquear — solo para decidir qué bandera lleva
la acta. Si los puntos cuadran contra `partidos.json.cuartos` pero los
minutos no, se publica igual, con la clave `min` borrada de TODOS los
jugadores del lado que falla en TODOS los cuartos (no se sabe qué jugador
ni qué cuarto es el responsable del déficit, así que se vacía el equipo
entero por honestidad, no por economía). Esto reutiliza sin tocarlo el
mecanismo que ya existía para el formato viejo de acta (`Partido.jsx`: clave
`min` ausente ⇒ columna "—") — la fila es idéntica a una de formato viejo
desde el punto de vista del front, aunque la causa sea otra.

**Por qué NO se escribe cuando los puntos tampoco cuadran** (dos casos
reales: cuarto final con puntos negativos, PDF del corte final vacío):
escribir esa acta dispara el guardián YA EXISTENTE de `verificar-cuartos.js`
("reparto cuarto a cuarto no cuadra con partidos.json") y **bloquea la
generación de cuartos para TODA la categoría**, no solo para ese partido —
probado de verdad en sandbox. `puntosCompletos` (la misma pregunta que ya
hace `boxscore-cuartos.js`) decide si se escribe SIQUIERA, no solo qué
bandera lleva: si no cuadra, la acta se queda fuera, como antes, solo
registrada en `actas-no-verificadas.json` con evidencia.

**Invariante nuevo, independiente** (`verificar-cuartos.js`): ningún cuarto
puede tener puntos negativos — al lado del invariante de "0-0 imposible"
(§17.14), misma política (bloquea siempre, sin segunda fuente). Hasta hoy
los dos casos de puntos negativos conocidos no llegaban nunca a producción
porque, por coincidencia, `verificarActa` también fallaba por minutos en
ambos — una protección accidental, no de diseño. Con `verificarActa` ya sin
poder de bloqueo (ver arriba), hacía falta una red de seguridad que no
dependiera de esa coincidencia.

**Efecto colateral conocido, no un bug**: el guardián de minutos de
`verificar-cuartos.js` (sección "Guardián de jugadores") clasifica una acta
con un lado vaciado como "de caché vieja" (el mismo chequeo que detecta el
formato antiguo mira exactamente la misma ausencia de `min`). Es solo un
contador informativo, no bloquea nada — pero si ese número sube para
partidos de la temporada viva, es esto, no una regresión de formato.

Detalle completo: `_informe-vigesimosegundo-lote.md`.

**Corrección del mismo día**: "vaciar el lado entero" era desproporcionado
para un déficit pequeño (`2535739`: 1:14: `2536117`: 6:56) — tirar los
minutos por cuarto de once o doce jugadores para esconder un descuadre de
segundos pierde dato bueno. Criterio medido, no un número a dedo: comparar
el déficit contra **el menor total de minutos no nulo de ese lado**. Si el
déficit es menor que el jugador con menos minutos de la tabla, ningún
jugador por sí solo puede explicarlo (ruido de transcripción repartido) →
se publica tal cual, con nota (`accion: 'con_descuadre'`). Si es igual o
mayor, al menos un jugador tiene su número mal de verdad → se vacía el
lado (`accion: 'vaciado'`), como antes. De las 7 ya publicadas, 3 resultan
`con_descuadre` (incluido `2536117`, que a pesar de "parecer pequeño" sigue
vaciándose: la medida no garantiza el resultado intuitivo, que es
justamente el punto de medir en vez de adivinar).

La nota deja de vivir solo en `data/raw` (que la app nunca lee):
`boxscore-cuartos.js` copia `minutosNoVerifican` al fichero servido, y
`Partido.jsx` la pinta encima de la tabla de jugadores, con el nombre del
equipo y el motivo. `verificar-cuartos.js` excluye las actas con
`minutosNoVerifican` de su contador de "caché vieja" y de su guardián de
minutos (`sinJugadores`) — sin esto, una acta `con_descuadre` (que SÍ
mantiene `min` en todos los cuartos, a propósito) volvería a fallar ese
guardián por la misma causa que ya decidimos aceptar, bloqueando la
categoría otra vez.

**Hallazgo de paso, sin arreglar**: `difJug` (la función que resta cortes
consecutivos para obtener el rendimiento por cuarto) nunca difference
`tap`, `tapRec`, `fc` ni `fr` — esos cuatro campos solo existen en el
Cuarto 1 de CUALQUIER acta, vieja o nueva, y `camposCompletosQ2a4` no lo
detecta porque solo comprueba `min`. Confirmado contra un partido ajeno a
este lote. No es nuevo de hoy; probablemente lleva así desde que existe el
desglose por cuartos. Pendiente de investigar (sesión aparte): si el PDF de
cada corte intermedio simplemente no trae esos campos, o si `difJug` los
tiene disponibles y se olvidó de copiarlos.

Detalle completo: `_informe-vigesimotercer-lote.md`.

**El hallazgo de arriba, confirmado y arreglado el mismo día**: los cortes
intermedios SÍ traen `tap`/`tapRec`/`fc`/`fr`/`mas` con valores reales
(verificado contra datos crudos) — era un bug de `difJug`, que solo
diferenciaba `min`/`pts`/etc desde el arreglo de S17.6, nunca estos cinco.
`difJug` ya resta los cinco; `camposCompletosQ2a4` (`boxscore-cuartos.js`)
ya comprueba los cinco campos, no solo `min`. Nuevo contador en
`verificar-cuartos.js` (`sinTapFcFr`), independiente de "caché vieja", para
medir si la reextracción ya llevó estos campos a su sitio sin reextraer
nada por sí mismo. **Solo probado en la temporada viva, a propósito**: el
arreglo todavía no llega a las actas ya cacheadas (se necesita un
`--forzar`, caro) — pendiente de decidir si se lanza ya o se deja para
cuando convenga.

Detalle completo: `_informe-vigesimocuarto-lote.md`.
