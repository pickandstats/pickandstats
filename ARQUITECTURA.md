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
- git add ampliado: incluye los ficheros de cuartos, que viven en web/public/data/ (no en data/processed/ como el resto).

**desplegar.yml — despliegue en GitHub Pages.** Se ejecuta en cada push a
main. Compila el sitio Astro (→ raíz del dominio) y la app React (→ /app/),
copia los datos procesados, ensambla la salida (verifica que el CNAME esté
presente para no perder el dominio) y publica. Nota de mantenimiento: copia
datos con cp -r data/processed/. web/public/data/. Como los ficheros de
cuartos viven directamente en web/public/data/ (no en data/processed/), esta
copia no los pisa (cp no borra lo que no está en origen). Funciona, pero es
una inconsistencia de ubicación a tener presente: si algún día el deploy
pasara a sincronizar con borrado (rsync --delete), los cuartos desaparecerían.

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

**Los ficheros de cuartos viven en web/public/data/, no en data/processed/.**
Inconsistencia con el resto del pipeline. Importa para: el git add del
workflow (ampliado para incluirlos) y el cp del despliegue (que no los pisa,
pero cuidado si se cambia a rsync --delete).

**El primer run del workflow con cache vacía es seguro** gracias al guardián
(verificar && calcular): si faltan actas, no se genera y los datos versionados
quedan intactos. La cache se va poblando en runs sucesivos.

**Mantenimiento periódico:**
- Septiembre (nueva temporada): añadir "2026" a los temporadas.json de las tres categorías (se mantienen a mano, no se generan). Verificar que el workflow arranca bien con la temporada nueva.
- react-router-dom tiene un aviso de npm audit (GHSA-qwww-vcr4-c8h2) que NO afecta a esta app (es estática, sin servidor). NO ejecutar audit fix --force (rompería la API). Actualizar a >8.2.0 cuando haya parche.

## 12. Pendientes y roadmap

**Hecho:**
- Completar Tercera con el análisis por cuartos (extracción → agregados → boxscore → deploy). *(31/08/2026)*
- Estrenar y vigilar el workflow con cuartos en sus primeras ejecuciones reales: la actualización automática del 31/08/2026 ya regeneró los agregados de cuartos de Primera y Segunda sin incidencias. *(31/08/2026)*
- Comparador de equipos/jugadores lado a lado (toggle en la pestaña Comparador, ver sección 15). *(01/09/2026)*

**Prioridad media:**
- Servicio de generación de PDF "al vuelo" que evite las notas de cabecera/pie del navegador (la exportación actual del dossier usa `window.print()` con CSS de impresión, que no las evita).
- Índice propio (valoración sintética).
- Unificar la ubicación de los ficheros de cuartos (llevarlos a data/processed/ como el resto) para eliminar la inconsistencia.

**Prioridad baja / a evaluar:**
- Ligas femeninas FEB (identificadas: g=4 LF Endesa grupo único, g=9/g=10 las de dos grupos; g=5-8 NO son nuevas, son vistas alternativas de Tercera). Esfuerzo ~2 tardes; la decisión es de demanda, no de viabilidad.
- Filiales en el registro de clubes (el campo existe, sin poblar).
- Shot charts con coordenadas — solo posibles vía la API autenticada; dependen de que la FEB responda a la solicitud de acceso.

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
calcular.js escribe en data/processed; el deploy copia processed -> public. Los
cuartos, en cambio, se generan directamente en public (inconsistencia ya
conocida). Al generar los percentiles de equipos con calcular.js, quedaron en
processed; para probar en local (donde la app lee de public) hay que copiar
processed -> public manualmente. En produccion el deploy lo hace solo.

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
  de log inequívoca `ACTAS: CACHE|RELEASE|FEB`, y sube la temporada en curso al
  final ("Publicar actas"). Sin manifest a propósito: la cache es todo-o-nada, así
  que la regla de restauración es simple —si el directorio de actas de la temporada
  está vacío o no existe, restaurar del release; si está, usarlo—. Al arrancar una
  temporada nueva aún no hay tarball suyo: eso se registra como normal, no como
  error; solo un release que no responde o está corrupto hace ruido. Detalle y
  criterio en `_informe-persistir-actas.md`. El repo es público (verificado) y las
  actas derivan de PDF públicos de la FEB, así que publicarlas no expone nada.
  Escala barato: git no crece (nunca se versionan), y el release suma ~100 MB por
  temporada, que en repo público es gratis.
- **El commit semanal nunca está vacío.** `estado.json` reescribe `actualizado`
  en cada ejecución, así que `git diff --staged --quiet` no se cumple nunca y la
  rama "Sin partidos nuevos esta semana" es código muerto. Efecto práctico: no se
  distingue de un vistazo una semana con datos de una semana en blanco.

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
