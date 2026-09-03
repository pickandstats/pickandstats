# Guía de scraping — PickAndStats

Manual **operativo** de la actualización manual de datos. Para el porqué de las
cosas (arquitectura, modelo de datos, decisiones), la fuente es **ARQUITECTURA.md**;
aquí solo van los comandos.

> En la práctica esto lo hace solo el workflow semanal (`.github/workflows/`,
> lunes). Esta guía es para correrlo a mano en local: una temporada desde cero, una
> categoría suelta, o depurar algo. Tiempo: 5-10 min una actualización semanal de
> una categoría; ~1 h una temporada desde cero (Tercera, la más grande).

El scraper es **multi-competición**: `--competicion 1` = Primera, `2` = Segunda,
`3` = Tercera (por defecto 3). Casi todos los scripts aceptan `--competicion N` y
`--temporada AAAA`.

---

## Requisitos previos (solo la primera vez en un equipo nuevo)

1. Tener Node instalado (`node --version`; el proyecto usa Node 24).
2. Clonar el repo y entrar en la carpeta:
   ```
   git clone git@github.com:pickandstats/pickandstats.git
   cd pickandstats
   ```
3. Instalar dependencias: `npm install`
4. Si la red bloquea el puerto 22 (error "Operation timed out" al hacer
   push/pull), crear `~/.ssh/config` con:
   ```
   Host github.com
     Hostname ssh.github.com
     Port 443
     User git
   ```

---

## Actualización habitual (tras cada jornada)

Desde la carpeta del proyecto. Los ejemplos usan Tercera (`--competicion 3`);
repite con `1` y `2` para las otras dos.

**1. Traer posibles cambios remotos:**
```
git pull
```

**2. Scrapear.** Salta lo ya descargado, así que se puede lanzar completo sin
miedo — solo baja los partidos nuevos:
```
node scraper/scrape.js --competicion 3
```
Salida esperada: "ya descargado, saltando" en lo viejo, "OK" en lo nuevo,
"sin resultado (no jugado aún)" en jornadas futuras. Sin `--temporada`, detecta
la temporada vigente en la FEB.

**3. Recalcular estadísticas:**
```
node scraper/calcular.js --competicion 3 --temporada 2025
node scraper/historico.js --competicion 3
```
Revisar el bloque "Partidos excluidos": incomparecencias y sanciones (boxscore
vacío). Es normal que haya alguno; se excluyen de las medias pero cuentan en la
clasificación.

**4. Análisis por cuartos** (opcional; extrae de las actas PDF). La cadena es
extraer → **verificar** → generar, y el verificador es un guardián real (corta si
las actas no están sanas):
```
node scraper/actas-cuartos.js     --competicion 3 --temporada 2025
node scraper/verificar-cuartos.js --competicion 3 --temporada 2025 \
  && node scraper/calcular-cuartos.js  --competicion 3 --temporada 2025 \
  && node scraper/boxscore-cuartos.js  --competicion 3 --temporada 2025
```
Detalle del sistema de cuartos en ARQUITECTURA.md §6 y §17.

**5. Guardar y subir:**
```
git add data/
git commit -m "Actualización jornada X"
git push
```

---

## Variantes del scraper (pruebas baratas)

```
node scraper/scrape.js --competicion 3 --grupo E-A                    # solo un grupo
node scraper/scrape.js --competicion 3 --grupo E-A --max-jornadas 1   # prueba rápida
node scraper/scrape.js --competicion 1 --temporada 2024              # otra comp/temporada
node scraper/actas-cuartos.js --competicion 3 --temporada 2025 --limite 5   # pocas actas
```
El scraper descubre los grupos solos; los nombres (A-A, A-B, …, E-B en Tercera)
pueden variar de orden.

---

## Nueva temporada (cada octubre)

No hay que tocar ningún ID. `scraper/temporada-actual.js` dice qué temporada cree
la FEB que es la vigente; el workflow la usa sola. En manual, basta con cambiar
`TEMPORADA_DEFECTO` en `scraper/config.js` (p. ej. '2026') o pasar `--temporada 2026`.
El scraper descubre los grupos nuevos por sí mismo. Ver ARQUITECTURA.md §17.2 (el
canario de transición) para el detalle del cambio de temporada.

---

## Dónde queda cada cosa

Las rutas llevan el segmento de **competición** (`primerafeb` / `segundafeb` /
`tercerafeb`):

```
data/raw/<comp>/<temporada>/<grupo>/<idPartido>.json   # boxscores en bruto (versionado)
data/raw/<comp>/<temporada>/<grupo>/_indice.json       # índice de partidos del grupo
data/raw/<comp>/<temporada>/actas/<id>.json            # actas por cuarto (CACHÉ gitignored)
data/processed/<comp>/<temporada>/equipos.json         # ratings, Four Factors, pace
data/processed/<comp>/<temporada>/jugadores.json       # TS%, eFG%, USG%, per-40...
data/processed/<comp>/<temporada>/excluidos.json       # partidos no disputados
data/processed/<comp>/<temporada>/{jugadores,equipos}-cuartos.json  # agregados por cuarto
data/processed/<comp>/<temporada>/boxscore-cuartos/<id>.json        # boxscore por cuarto
```

Las actas (`data/raw/*/*/actas/`) son caché gitignored (~100 MB); solo viven en la
cache de Actions y en un release asset de respaldo (ARQUITECTURA.md §17.4). Todo
lo de `data/processed/` es producto final versionado; el deploy lo copia a
`web/public/data/` y de ahí Vite a la app. En **dev local** (`npm run dev`) la app
lee de `web/public/`, así que para ver datos frescos hay que copiar
`data/processed`→`web/public/data` a mano.

---

## Problemas conocidos y soluciones

- **`git push` da "port 22: Operation timed out"** → red que bloquea SSH.
  Solución permanente en "Requisitos previos", punto 4. El commit local nunca se
  pierde; se puede hacer push más tarde desde otra red.
- **Un partido sale con jugadores 0+0 y resultado 0-2 o 2-0** →
  incomparecencia/sanción. Correcto: se guarda para la clasificación y se excluye
  de las estadísticas automáticamente.
- **El scraper se interrumpe (Ctrl+C, corte de red...)** → relanzar sin más;
  continúa donde lo dejó gracias al "ya descargado, saltando".
- **`_indice.json` incompleto tras una prueba con `--max-jornadas`** → se regenera
  completo en la siguiente pasada sin límite.
- **Actas a medias**: `actas-cuartos.js` salta por existencia del fichero, pero
  re-extrae las que no están sanas (hasta 4 intentos). Si dudas, `verificar-cuartos.js`
  da el veredicto. Detalle en ARQUITECTURA.md §17.1.
- **Cambia el diseño de la web de la FEB y el parseo falla** → los exploradores de
  diagnóstico siguen en `scraper/explorar*.js`; `explorar2.js` (desplegables) y
  `explorar6.js` (estructura de partido) para localizar qué cambió.

---

## Reglas de cortesía

El scraper espera 1,2 s entre peticiones (`PAUSA_MS` en config.js). No bajar de
ahí: es la web de la FEB y queremos ser buenos ciudadanos. Y no se usa la API
autenticada de la FEB (decisión ética, ARQUITECTURA.md §10).
