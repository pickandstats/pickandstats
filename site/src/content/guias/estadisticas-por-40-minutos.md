---
titulo: Las estadísticas por 40 minutos, cómo comparar a un suplente con un titular
descripcion: Qué son las estadísticas per-40, por qué revelan a jugadores que las medias por partido esconden y qué límites tienen, con ejemplos reales de la Tercera FEB.
descripcionSeo: Qué son las estadísticas per-40, por qué revelan a jugadores que las medias por partido esconden y qué límites tienen. Ejemplos de Tercera FEB.
familia: metricas
orden: 6
fecha: 2026-08-03
actualizado: 2026-08-09
temporada: "2025/26"
---

En la Tercera FEB 2025/26, Arturo Seara promedió 20,1 puntos por partido y Juan
Manuel Martín 11,3. En cualquier tabla de anotadores, el primero aparece arriba y el
segundo se pierde a media lista.

Pero Seara jugaba 32,7 minutos y Martín 18,3. Ajustando por tiempo en pista, ambos
producen **prácticamente lo mismo**: unos 24,6 puntos por cada 40 minutos.

## El problema: los minutos no se reparten igual

Las medias por partido mezclan dos cosas distintas: **cuánto produce un jugador** y
**cuánto tiempo le dejan jugar**. Un suplente que rinde de maravilla en quince
minutos aparecerá siempre por debajo de un titular mediocre que juega treinta.

Eso no es un defecto del dato, pero sí una limitación evidente si lo que quieres
saber es quién juega mejor y no quién juega más.

## La solución: normalizar a 40 minutos

Las estadísticas **per-40** proyectan lo que produciría un jugador si disputase el
partido entero, manteniendo su ritmo actual. El cálculo es directo:

```
Estadística por 40 = (Total de la estadística / Minutos totales) × 40
```

Se usan 40 porque es lo que dura un partido en el baloncesto FIBA, y por tanto en
todas las competiciones europeas. Es también la referencia habitual en la ACB y en
el análisis español: el ritmo de juego, por ejemplo, se define como las posesiones
que disputa un equipo cada 40 minutos.

En la NBA verás la variante **per-36**, porque allí el partido dura 48 y 36 es lo que
juega aproximadamente un titular importante. Las dos miden lo mismo; solo cambia la
escala, así que las cifras por 36 son un 10% más bajas que las mismas por 40.

## Lo que revela

En la Tercera FEB 2025/26, el caso más llamativo fue **Enaitz Errasti**, del Teknei
Bizkaia Zornotza: 13,5 puntos en 17,9 minutos, es decir, **30,0 puntos por cada 40
minutos**.

Para dimensionarlo: ningún titular de la categoría llegó a esa cifra. El mejor entre
los que jugaban más de treinta minutos fue Alan Moreno, del Surseeds B. Murgi, con
26,9. En la tabla de anotadores por partido Errasti no aparece entre los primeros;
por minuto jugado, produce más que nadie.

Hay más ejemplos del mismo tipo. Marcos Bartolomé, de la Universidad de Oviedo,
promedia 10,5 puntos en 17,4 minutos: 24,3 por cada 40, prácticamente lo mismo que
Jonathan Jorge (18,4 puntos en 30,4 minutos, 24,2 por 40). Uno es un anotador
destacado de la liga y el otro pasa desapercibido, pero producen igual.

## Para qué sirve de verdad

**Para detectar jugadores infrautilizados.** Si alguien produce a ritmo de titular en
minutos de suplente, quizá merezca más responsabilidad —o sea un fichaje interesante
para otro equipo.

**Para comparar entre roles.** Poner en la misma escala a un titular y a un
recambio permite valorar quién aporta más cuando está en pista.

**Para preparar un rival.** Un banquillo con jugadores de per-40 alto cambia el
partido cuando entran, aunque sus medias por partido no impresionen.

## Sus límites, que son reales

Aquí conviene ser honesto, porque la métrica se sobreinterpreta con facilidad.

**Producir en quince minutos no garantiza producir en cuarenta.** Es su límite
principal. Un jugador con pocos minutos suele entrar en momentos concretos, contra
segundas unidades o con el partido decidido. Nada asegura que mantendría ese ritmo
con más carga, defensas centradas en él y el desgaste de un partido completo.

**Las muestras pequeñas exageran.** Con pocos minutos totales, cualquier racha buena
dispara el per-40. Conviene mirarlo junto a los partidos y minutos jugados, no
aislado.

**No dice nada de la defensa ni del encaje.** Un jugador puede anotar mucho por
minuto y ser un problema en el otro lado de la pista, o no encajar con el sistema.

Por eso el per-40 no sustituye a las medias por partido: las **complementa**. Las
medias dicen lo que un jugador aporta realmente a su equipo; el per-40, a qué ritmo
lo hace cuando está en pista.

## Cómo se relaciona con el resto

El per-40 hace con los minutos lo que
[el rating ofensivo](/guias/rating-ofensivo-defensivo/) hace con las posesiones y
[los percentiles](/guias/como-leer-percentiles/) con el nivel de la categoría:
**quitar de en medio una variable de contexto** para poder comparar en igualdad de
condiciones.

Los tres responden a la misma pregunta desde ángulos distintos: ¿qué está pasando
aquí, más allá de lo que dicen los totales?

## Dónde verlas

En [Pick&Stats](/app/), las estadísticas por 40 minutos están en la ficha de cada
jugador, en el modo **Detalle**, junto al porcentaje de uso y al resto de métricas de
impacto. También en la vista **Jugadores**, en la pestaña **Per-40**, que permite
ordenar toda la categoría por producción ajustada al tiempo de juego.

---

Sigue por [cómo leer los percentiles](/guias/como-leer-percentiles/), que sitúan a
cada jugador frente al resto de la categoría.
