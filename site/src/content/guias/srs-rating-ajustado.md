---
titulo: El SRS, qué añade ajustar el rating por la dificultad del calendario
descripcion: Qué es el rating ajustado, por qué el mejor equipo de la liga sale perdiendo al aplicarlo, y por qué con la temporada terminada no cambia absolutamente nada. Con la medición completa de la Primera FEB.
descripcionSeo: Qué es el SRS o rating ajustado, cómo corrige la dificultad del calendario y por qué con la liga terminada no altera el orden del rating neto.
familia: metricas
orden: 5
fecha: 2026-09-09
temporada: "2025/26"
---

El Monbus Obradoiro ganó la Primera FEB 2025/26 con el mejor
[rating neto](/guias/rating-ofensivo-defensivo/) de la categoría: **+20,6** puntos por
cada 100 posesiones. Su rating ajustado por calendario, el SRS, es **+19,4**.

Es decir: al corregir por la dificultad de los rivales, el mejor equipo de la liga **pierde
un punto**. Suena raro hasta que se ve el motivo, que es de una simplicidad total: el
Obradoiro es el único equipo de la categoría que **no se enfrenta al Obradoiro**. Todos
los demás sí. Su calendario fue, por definición, un poco más fácil que el de sus rivales.

Esa es toda la idea del SRS. Y esta guía va a contar tanto lo que aporta como lo que no,
porque lo segundo es más interesante de lo que parece.

## El problema circular

Medir la dificultad de un calendario parece sencillo: mira contra quién has jugado y suma
lo buenos que son. Pero *lo buenos que son* depende a su vez de contra quién han jugado
**ellos**, que depende de contra quién jugaron los suyos. La pregunta se muerde la cola.

El SRS resuelve esa circularidad de la única forma que se puede: por aproximaciones
sucesivas. Empieza suponiendo que la fuerza de cada equipo es su rating neto, calcula con
eso la dificultad media de cada calendario, corrige, y vuelve a empezar. Al cabo de unas
cuantas vueltas los números dejan de moverse, y ese punto de equilibrio es el SRS.

```
SRS de un equipo = Rating neto + media del SRS de los rivales a los que se ha enfrentado
```

Se repite hasta que converge, y en cada vuelta se recentra el grupo para que el ajuste
medio sea cero: dentro de un grupo donde todos juegan contra todos, la dificultad media
del calendario tiene que ser, por construcción, la media.

El rating neto del que parte se calcula por cada 100 posesiones, con
[la estimación de posesiones de siempre](/guias/ritmo-de-juego-pace/#posesiones).

## Lo que sale con la liga terminada

Estos son los ajustes de la Primera FEB 2025/26, ordenados por rating neto:

| Equipo | Rating neto | SRS | Ajuste |
|---|---|---|---|
| Monbus Obradoiro | +20,62 | +19,41 | **−1,21** |
| Súper Agropal Palencia | +13,83 | +13,02 | −0,81 |
| Leyma Coruña | +13,63 | +12,83 | −0,80 |
| Inveready Gipuzkoa | +7,26 | +6,83 | −0,43 |
| Flexicar Fuenlabrada | −0,94 | −0,88 | +0,06 |
| Caja Rural CB Zamora | −3,49 | −3,28 | +0,21 |
| Grupo Ureta Tizona Burgos | −6,62 | −6,23 | +0,39 |
| Grupo Caesa Seguros FC Cartagena | −13,98 | −13,16 | **+0,82** |

Mira la columna del ajuste: es **perfectamente monótona**. Los buenos pierden, los malos
ganan, y cuanto más extremo es el equipo más se mueve. No hay ninguna sorpresa, ningún
equipo al que el calendario le haya hecho un favor o una jugarreta.

## Y aquí está lo que casi nadie cuenta

Si el ajuste es monótono, entonces **no cambia el orden de nadie**. Y eso es exactamente
lo que pasa.

Comprobado sobre las tres categorías, en los **trece grupos** de la temporada 2025/26:
el orden por SRS es idéntico al orden por rating neto. **Cero pares invertidos, cero
equipos que cambien de puesto.**

No es mala suerte ni un defecto del cálculo: es aritmética. En un grupo cerrado donde
todos juegan contra todos el mismo número de veces, la única asimetría que queda es la de
no enfrentarse a uno mismo, y eso vale aproximadamente `−rating neto / (equipos − 1)`. Un
reescalado, no una reordenación.

**Con la liga terminada, el SRS no aporta ni un dato nuevo sobre quién fue mejor.** Si
alguien te lo vende como un ranking más fino que el rating neto, no lo es.

## Entonces, ¿para qué sirve?

Para la temporada **en marcha**, que es cuando los calendarios de verdad se diferencian.
En la jornada 8 un equipo puede haber jugado contra los tres mejores y otro contra los
tres peores, y ahí el ajuste sí dice algo.

Se puede medir. Recalculando el SRS de la Primera FEB 2025/26 con solo los partidos
disputados hasta cada jornada:

| Tras la jornada | Equipos que cambian de puesto | Rango del ajuste |
|---|---|---|
| 4 | 12 de 17 | 39,8 |
| 6 | 13 de 17 | 10,9 |
| 10 | 9 de 17 | 10,6 |
| 14 | 6 de 17 | 6,2 |
| 18 | 4 de 17 | 3,4 |
| 26 | 4 de 17 | 4,1 |
| 34 (liga completa) | **0 de 17** | 2,0 |

La lectura es limpia: **el SRS empieza importando mucho y termina no importando nada**. A
medida que el calendario se equilibra, el ajuste se encoge y las diferencias entre equipos
desaparecen, hasta que en la última jornada el orden coincide exactamente con el del
rating neto.

Con una advertencia en el otro extremo: en la jornada 4, con tres o cuatro partidos
jugados, el rango del ajuste se dispara a casi 40 puntos. Eso no es información, es ruido
— con esa muestra ni el rating neto ni el SRS describen todavía a nadie. **La ventana útil
del SRS es el medio de la temporada**, no las primeras jornadas ni el final.

## El otro límite, y no es pequeño

**El SRS solo es comparable entre equipos del mismo grupo.** En liga regular no hay
partidos entre grupos: los diez subgrupos de la Tercera FEB, o los dos de la Segunda, son
diez y dos universos separados que no se tocan. Un SRS de +12 en un grupo y otro de +12 en
otro no dicen que los equipos sean equivalentes, porque las dos escalas se han calibrado
sobre poblaciones distintas que nunca se han medido entre sí.

Para comparar entre grupos no hay atajo estadístico: hacen falta partidos entre ellos, y
esos solo llegan en las fases de ascenso.

## Dónde verlo

En [Pick&Stats](/app/), el SRS está en la vista **Equipos**, junto al ritmo y a los
ratings, y en la ficha de cada equipo. Léelo como lo que es: durante la temporada, una
corrección útil de quién ha tenido el camino más duro; al terminarla, una nota a pie de
página del rating neto.

---

Sigue por [el rating ofensivo y defensivo](/guias/rating-ofensivo-defensivo/), que es lo
que el SRS ajusta, o por
[las victorias esperadas](/guias/victorias-esperadas-suerte/), que atacan la misma
pregunta —qué merecía un equipo— desde el resultado en vez de desde el calendario.
