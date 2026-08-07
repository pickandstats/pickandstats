---
titulo: Las estadísticas por 36 minutos, cómo comparar a un suplente con un titular
descripcion: Qué son las estadísticas per-36, por qué revelan a jugadores que las medias por partido esconden y qué límites tienen, con ejemplos reales de la Tercera FEB.
fecha: 2026-08-03
---

En la Tercera FEB 2025/26, Arturo Seara promedió 20,1 puntos por partido y Juan
Manuel Martín 11,3. En cualquier tabla de anotadores, el primero aparece arriba y el
segundo se pierde a media lista.

Pero Seara jugaba 32,7 minutos y Martín 18,3. Ajustando por tiempo en pista, ambos
producen **exactamente lo mismo**: 22,2 puntos por cada 36 minutos.

## El problema: los minutos no se reparten igual

Las medias por partido mezclan dos cosas distintas: **cuánto produce un jugador** y
**cuánto tiempo le dejan jugar**. Un suplente que rinde de maravilla en quince
minutos aparecerá siempre por debajo de un titular mediocre que juega treinta.

Eso no es un defecto del dato, pero sí una limitación evidente si lo que quieres
saber es quién juega mejor y no quién juega más.

## La solución: normalizar a 36 minutos

Las estadísticas **per-36** proyectan lo que produciría un jugador si jugase 36
minutos, manteniendo su ritmo de producción actual. El cálculo es directo:

```
Estadística por 36 = (Total de la estadística / Minutos totales) × 36
```

Se usan 36 y no 40 —la duración de un partido— porque es el tiempo aproximado que
juega un titular importante. Proyectar a 40 daría cifras que casi nadie alcanza en la
práctica.

## Lo que revela

En la Tercera FEB 2025/26, el caso más llamativo fue **Enaitz Errasti**, del Teknei
Bizkaia Zornotza: 13,5 puntos en 17,9 minutos, es decir, **27,0 puntos por cada 36
minutos**.

Para dimensionarlo: ningún titular de la categoría llegó a esa cifra. El mejor entre
los que jugaban más de treinta minutos fue Alan Moreno, del Surseeds B. Murgi, con
24,2. En la tabla de anotadores por partido Errasti no aparece entre los primeros;
por minuto jugado, produce más que nadie.

Hay más ejemplos del mismo tipo. Marcos Bartolomé, de la Universidad de Oviedo,
promedia 10,5 puntos en 17,4 minutos: 21,8 por cada 36, prácticamente lo mismo que
Jonathan Jorge (18,4 puntos en 30,4 minutos, 21,8 por 36). Uno es un anotador
destacado de la liga y el otro pasa desapercibido, pero producen igual.

## Para qué sirve de verdad

**Para detectar jugadores infrautilizados.** Si alguien produce a ritmo de titular en
minutos de suplente, quizá merezca más responsabilidad —o sea un fichaje interesante
para otro equipo.

**Para comparar entre roles.** Poner en la misma escala a un titular y a un
recambio permite valorar quién aporta más cuando está en pista.

**Para preparar un rival.** Un banquillo con jugadores de per-36 alto cambia el
partido cuando entran, aunque sus medias por partido no impresionen.

## Sus límites, que son reales

Aquí conviene ser honesto, porque la métrica se sobreinterpreta con facilidad.

**Producir en quince minutos no garantiza producir en treinta.** Es su límite
principal. Un jugador con pocos minutos suele entrar en momentos concretos, contra
segundas unidades o con el partido decidido. Nada asegura que mantendría ese ritmo
con más carga, defensas centradas en él y el desgaste de un partido completo.

**Las muestras pequeñas exageran.** Con pocos minutos totales, cualquier racha buena
dispara el per-36. Conviene mirarlo junto a los partidos y minutos jugados, no
aislado.

**No dice nada de la defensa ni del encaje.** Un jugador puede anotar mucho por
minuto y ser un problema en el otro lado de la pista, o no encajar con el sistema.

Por eso el per-36 no sustituye a las medias por partido: las **complementa**. Las
medias dicen lo que un jugador aporta realmente a su equipo; el per-36, a qué ritmo
lo hace cuando está en pista.

## Cómo se relaciona con el resto

El per-36 hace con los minutos lo que
[el rating ofensivo](/guias/rating-ofensivo-defensivo) hace con las posesiones y
[los percentiles](/guias/como-leer-percentiles) con el nivel de la categoría:
**quitar de en medio una variable de contexto** para poder comparar en igualdad de
condiciones.

Los tres responden a la misma pregunta desde ángulos distintos: ¿qué está pasando
aquí, más allá de lo que dicen los totales?

## Dónde verlas

En [Pick&Stats](/app/), las estadísticas por 36 minutos están en la ficha de cada
jugador, en el modo **Detalle**, junto al porcentaje de uso y al resto de métricas de
impacto. También en la vista **Jugadores**, en la pestaña **Per-36**, que permite
ordenar toda la categoría por producción ajustada al tiempo de juego.

---

Sigue por [cómo leer los percentiles](/guias/como-leer-percentiles), que sitúan a
cada jugador frente al resto de la categoría.
