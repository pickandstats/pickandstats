---
titulo: Victorias esperadas y suerte, cuántos partidos merecía ganar tu equipo
descripcion: Qué son las victorias esperadas, cómo se calculan con la fórmula pitagórica y por qué revelan si un equipo ha tenido suerte o se le ha escapado la temporada, con ejemplos de la Primera FEB.
descripcionSeo: Qué son las victorias esperadas, cómo se calculan con la fórmula pitagórica y por qué revelan si un equipo ha tenido suerte. Primera FEB.
familia: metricas
orden: 4
fecha: 2026-07-27
temporada: "2025/26"
---

Un equipo de la Primera FEB 2025/26 terminó con 19 victorias y 13 derrotas, séptimo,
metido en el play-off de ascenso. Y sin embargo encajó más puntos de los que anotó a lo
largo de la temporada. Su diferencia de puntos era negativa.

¿Cómo se gana más de la mitad de los partidos anotando menos que el rival? Ganando los
ajustados y perdiendo los goleados. A veces eso es mérito. A veces es suerte. Las
victorias esperadas ayudan a distinguirlo.

## La idea: los puntos no mienten, el marcador final sí puede

Imagina dos equipos con el mismo balance de 16-16. El primero ha ganado sus dieciséis
partidos de veinte puntos y ha perdido los otros dieciséis de dos. El segundo, lo
contrario. En la clasificación son idénticos. Pero está claro que uno es bastante mejor
equipo que el otro.

La diferencia total de puntos captura eso que el balance esconde. Y a partir de ella se
puede estimar **cuántos partidos "debería" haber ganado un equipo** dado lo que anotó y
lo que encajó.

## La fórmula pitagórica

La idea viene del béisbol, donde Bill James observó que el balance de un equipo se podía
predecir muy bien a partir de las carreras anotadas y encajadas. La llamó pitagórica por
el parecido de la fórmula con el teorema:

```
Victorias esperadas = Partidos jugados × PF^E / (PF^E + PC^E)
```

Donde **PF** son los puntos a favor de toda la temporada, **PC** los puntos en contra, y
**E** un exponente que depende del deporte. En baloncesto, John Hollinger calibró que el
valor que mejor ajusta es **10,25**, y es el que usa Pick&Stats.

Ese exponente no es arbitrario ni intercambiable entre deportes. En baloncesto se anota
mucho y las diferencias relativas son pequeñas, así que hace falta un exponente alto para
que la fórmula sea sensible: una diferencia del 5% en puntos ya implica un cambio grande
en victorias esperadas.

## La suerte: la diferencia entre lo que pasó y lo que tocaba

Restando una cosa de la otra sale lo que en Pick&Stats aparece como **suerte**:

```
Suerte = Victorias reales − Victorias esperadas
```

Un valor positivo significa que el equipo ganó más de lo que su diferencia de puntos
sugería. Negativo, que ganó menos.

La palabra "suerte" es cómoda pero conviene tomarla con pinzas, y ahora veremos por qué.

## Lo que reveló la Primera FEB 2025/26

**El caso más llamativo fue el [Flexicar Fuenlabrada](/app/primerafeb/2025/equipo/fuenlabrada).**
Acabó 19-13, séptimo, pero sus puntos daban para **15,1 victorias**. Casi cuatro partidos
por encima de lo esperado, el mayor desvío de la categoría. Su rating neto era de −0,9:
ligeramente negativo, el de un equipo de media tabla justa. Ganó los partidos apretados.

**En el otro extremo, el [Hestia Menorca](/app/primerafeb/2025/equipo/hestia-menorca).** Terminó
17-15 cuando le correspondían **19,8 victorias**: casi tres menos de las merecidas. Su
rating neto, +4,2, era mejor que el del Fuenlabrada, y sin embargo acabó por detrás en la
clasificación.

Es decir: en rendimiento real, Menorca fue mejor equipo que Fuenlabrada esa temporada. La
clasificación dijo lo contrario.

**Arriba el efecto fue mínimo.** El [Leyma Coruña](/app/primerafeb/2025/equipo/leyma-coruna)
ganó 28 con 26,2 esperadas, y el [Monbus Obradoiro](/app/primerafeb/2025/equipo/obradoiro)
también 28. Cuando un equipo domina de verdad, la fórmula y la realidad coinciden: hay
poco margen para que la suerte cambie nada.

## ¿Es suerte de verdad?

Aquí toca ser honesto, porque el nombre de la métrica promete más de lo que puede
demostrar. Un desvío positivo puede venir de al menos tres cosas distintas:

**Azar puro.** Los partidos que se deciden en el último tiro son casi una moneda al aire.
Un equipo que juegue muchos y gane la mayoría acumulará desvío positivo sin que haya nada
detrás.

**Habilidad real en momentos decisivos.** Un buen entrenador gestionando finales
apretados, un jugador fiable en los tiros libres, una defensa que aprieta en los últimos
minutos. Eso es mérito, no fortuna.

**Gestión del esfuerzo.** Equipos que no fuerzan cuando el partido ya está resuelto pierden
diferencia de puntos sin perder partidos. Su desvío positivo es un artefacto del cálculo.

La estadística no distingue entre esas tres cosas. Lo que sí sabemos, por el
comportamiento de la métrica a lo largo de muchas temporadas, es que **el desvío tiende a
corregirse**: un equipo con mucha suerte positiva un año raramente la repite al siguiente.
Eso apunta a que el azar pesa bastante. Pero es una tendencia general, no una predicción
sobre un equipo concreto.

## Para qué sirve entonces

No para decidir quién es mejor, sino para **hacerse las preguntas correctas**.

Si tu equipo va séptimo con suerte muy positiva, conviene saber que el rendimiento de
fondo es peor de lo que dice la clasificación, y que si nada cambia probablemente
descienda posiciones. Si va décimo con suerte negativa, hay margen de mejora sin tocar
nada: solo con que los partidos ajustados caigan del otro lado.

Y para un entrenador que prepara un rival, es contexto útil: un equipo con gran desvío
positivo suele ser peor de lo que aparenta en la tabla.

## Cómo se relaciona con el resto

Las victorias esperadas parten de la **diferencia de puntos**, que es una medida cruda.
El [rating neto](/guias/rating-ofensivo-defensivo/) mide lo mismo pero ajustado por
posesiones, así que es más preciso, y los
[Four Factors](/guias/four-factors-baloncesto/) explican de dónde sale esa diferencia.

Las tres se leen juntas: los factores dicen *cómo* juega un equipo, el rating *cuánto*
rinde, y las victorias esperadas si ese rendimiento se ha traducido en la clasificación
que le corresponde.

## Dónde verlas

En [Pick&Stats](/app/), las victorias esperadas y la suerte están en la vista **Equipos**,
pestaña **Avanzada**, junto al rating neto y al resto de métricas de contexto.

---

Sigue por [el rating ofensivo y defensivo](/guias/rating-ofensivo-defensivo/), que mide el
rendimiento con más precisión que la diferencia de puntos.
