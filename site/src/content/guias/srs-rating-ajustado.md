---
titulo: El SRS, qué añade ajustar el rating por la dificultad del calendario
descripcion: Qué es el rating ajustado, por qué el mejor equipo de la liga sale perdiendo al aplicarlo, y por qué con la temporada terminada no cambia absolutamente nada. Con la medición completa de la Primera FEB.
descripcionSeo: Qué es el SRS o rating ajustado, cómo corrige la dificultad del calendario y por qué con la liga terminada no altera el orden del rating neto.
familia: metricas
orden: 5
fecha: 2026-09-09
actualizado: 2026-10-04
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
A media temporada un equipo puede haber jugado ya contra los tres mejores y otro contra
los tres peores, y ahí el ajuste sí dice algo.

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

La mitad de esa lectura es limpia: **el SRS termina no importando nada**. A medida que el
calendario se equilibra, el ajuste se encoge y las diferencias entre equipos desaparecen,
hasta que en la última jornada el orden coincide exactamente con el del rating neto.

La otra mitad —que al principio «importa mucho» porque reordena a 12 de 17— es una trampa,
y hace falta otra medición para verla.

## El otro extremo: la trampa de las primeras jornadas

Esa tabla invita a una conclusión que es falsa: si en la jornada 4 el ajuste mueve a 12 de
17 equipos, parece que ahí es donde más sirve. **Mover mucho y decir algo no son lo mismo.**
Un ajuste que zarandea media tabla puede ser señal… o puede ser que la muestra todavía no
sostiene ningún ajuste. Hay que mirarlo por separado.

Esto es lo que *vale* el ajuste —la diferencia entre el SRS y el rating neto de cada
equipo— jornada a jornada, en las dos últimas temporadas completas de la Primera FEB. La
columna de la derecha de cada par es la proporción de equipos cuyo ajuste pasa de 3 puntos:

| Jornada | 2025/26: ajuste medio | %>3 | 2024/25: ajuste medio | %>3 |
|---|---|---|---|---|
| 1 | 0,00 | 0% | 0,00 | 0% |
| 2 | **16,15** | **100%** | **17,42** | **94%** |
| 3 | 9,27 | 71% | 5,93 | 72% |
| 4 | 7,13 | 76% | 4,46 | 56% |
| 5 | 3,39 | 47% | 2,52 | 33% |
| 8 | 2,01 | 29% | 2,63 | 33% |
| 11 | 1,49 | 12% | 1,81 | 17% |
| 14 | 1,61 | 12% | 1,34 | 0% |
| **15** | 1,27 | **0%** | 1,34 | **0%** |
| 20 | 0,76 | 0% | 1,20 | 0% |
| 34 | 0,49 | 0% | 0,45 | 0% |

(Esta tabla y la anterior miden cosas distintas y conviene no mezclarlas: arriba, **el
rango** —la distancia entre el ajuste mayor y el menor de la liga—; aquí, **la media** de
cuánto se mueve cada equipo. Por eso la jornada 4 aparece como 39,8 en una y como 7,13 en
la otra.)

**En la jornada 1 el ajuste es exactamente cero.** Con un partido jugado, cada equipo se ha
cruzado con un solo rival y la corrección no tiene sobre qué trabajar: el SRS *es* el rating
neto, dígito a dígito, para todos los equipos de la tabla.

**Y en la jornada 2 se dispara a dieciséis puntos de media**, con el cien por cien de los
equipos por encima de 3. Para situarlo: el mejor SRS de una temporada completa que hemos
medido es el +19,41 del Obradoiro. En la jornada 2 el *ajuste* solo, el añadido sobre el
neto, vale casi eso.

Ahí está la trampa, y es la lección que vale más allá del SRS: **el primer momento en que
una métrica empieza a diferenciarse de otra suele ser el momento en que menos se puede uno
fiar de ella.** Un umbral puesto en «cuando ya no es cero» es casi siempre un umbral mal
puesto.

Y resuelve la aparente contradicción con la tabla anterior: el SRS **sí** reordena mucho en
la jornada 4, pero reordena mucho **porque es ruido**, no a pesar de serlo.

El ajuste se asienta en la **jornada 15** —la 14 en 2024/25; las dos temporadas coinciden
dentro de una jornada— y a partir de ahí ningún equipo vuelve a superar los 3 puntos. Por
eso **en Pick&Stats la columna del SRS aparece en guiones hasta la jornada 15**, con una
nota que dice desde cuándo se verá. Preferimos un hueco explicado a un número que parece
información y es ruido de muestra.

**La ventana útil del SRS es, entonces, de la jornada 15 en adelante y antes del final**:
cuando el calendario ya ha generado diferencias reales pero todavía no se ha equilibrado del
todo.

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
