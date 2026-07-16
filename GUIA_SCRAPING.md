# Guía de scraping — PickAndStats

Proceso completo para actualizar los datos de Tercera FEB. Tiempo estimado:
5-10 min para una actualización semanal, ~1 hora para una temporada desde cero.

---

## Requisitos previos (solo la primera vez en un equipo nuevo)

1. Tener Node instalado (`node --version` para comprobar).
2. Clonar el repo y entrar en la carpeta:
   ```
   git clone git@github.com:pickandstats-stack/pickandstats.git
   cd pickandstats
   ```
3. Instalar dependencias:
   ```
   npm install
   ```
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

Desde la carpeta del proyecto:

**1. Traer posibles cambios remotos (por si se trabajó desde otro equipo):**
```
git pull
```

**2. Scrapear.** El scraper salta lo ya descargado, así que se puede lanzar
completo sin miedo — solo bajará los partidos nuevos:
```
node scraper/scrape.js
```
Salida esperada: "ya descargado, saltando" en lo viejo, "OK" en lo nuevo,
"sin resultado (no jugado aún)" en jornadas futuras.

**3. Recalcular estadísticas:**
```
node scraper/calcular.js
```
Revisar el bloque "Partidos excluidos": ahí aparecen incomparecencias y
sanciones (boxscore vacío). Es normal que haya alguno; se excluyen solos
de las medias pero cuentan en la clasificación.

**4. Guardar y subir:**
```
git add .
git commit -m "Actualización jornada X"
git push
```

---

## Variantes del scraper

```
node scraper/scrape.js                                # temporada 2025, 10 grupos
node scraper/scrape.js --grupo E-A                    # solo un grupo
node scraper/scrape.js --grupo E-A --max-jornadas 1   # prueba rápida
node scraper/scrape.js --temporada 2024               # otra temporada (descubre
                                                      #  sus grupos automáticamente)
node scraper/calcular.js --temporada 2024             # calcular esa temporada
```

Nombres de grupo válidos: A-A, A-B, B-A, B-B, C-A, C-B, D-A, D-B, E-A, E-B
(los descubre solos; el orden puede variar).

---

## Nueva temporada (cada octubre)

No hay que tocar ningún ID. Basta con cambiar `TEMPORADA_DEFECTO` en
`scraper/config.js` (p. ej. '2026' para la temporada 2026/27) o usar
`--temporada 2026`. El scraper descubre los grupos nuevos por sí mismo.

---

## Dónde queda cada cosa

```
data/raw/<temporada>/<grupo>/<idPartido>.json   # boxscores en bruto
data/raw/<temporada>/<grupo>/_indice.json       # índice de partidos del grupo
data/processed/<temporada>/equipos.json         # ratings, Four Factors, pace
data/processed/<temporada>/jugadores.json       # TS%, eFG%, USG%, per-36...
data/processed/<temporada>/excluidos.json       # partidos no disputados
```

---

## Problemas conocidos y soluciones

- **`git push` da "port 22: Operation timed out"** → red que bloquea SSH.
  Solución permanente en "Requisitos previos", punto 4. El commit local
  nunca se pierde; se puede hacer push más tarde desde otra red.
- **Un partido sale con jugadores 0+0 y resultado 0-2 o 2-0** →
  incomparecencia/sanción. Es correcto: se guarda para la clasificación
  y se excluye de las estadísticas automáticamente.
- **El scraper se interrumpe (Ctrl+C, corte de red...)** → relanzar sin
  más; continúa donde lo dejó gracias al "ya descargado, saltando".
- **`_indice.json` incompleto tras una prueba con `--max-jornadas`** →
  se regenera completo en la siguiente pasada sin límite.
- **Cambia el diseño de la web de la FEB y el parseo falla** → los
  exploradores de diagnóstico siguen en `scraper/explorar*.js`; ejecutar
  `explorar2.js` (desplegables) y `explorar6.js` (estructura de partido)
  para localizar qué cambió.

---

## Reglas de cortesía

El scraper espera 1,2 s entre peticiones (`PAUSA_MS` en config.js).
No bajar de ahí: es la web de la FEB y queremos ser buenos ciudadanos.
