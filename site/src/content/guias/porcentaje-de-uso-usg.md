---
titulo: El porcentaje de uso, cuánta responsabilidad ofensiva asume un jugador
descripcion: Qué mide el USG%, por qué el 20% es la cifra de referencia, cómo se lee cruzado con la eficiencia de tiro y qué no dice sobre la calidad de un jugador. Con ejemplos reales de la Tercera FEB.
descripcionSeo: Qué mide el porcentaje de uso, cómo se lee junto a la eficiencia de tiro y por qué en la Tercera FEB los que más tiran son también los más eficientes.
familia: metricas
orden: 7
fecha: 2026-09-08
temporada: "2025/26"
---

En la guía de [TS% y eFG%](/guias/ts-efg-porcentaje-tiro/) aparecía Màxim Esteban como
el tirador más eficiente de la Tercera FEB 2025/26: un 65,3 de eficiencia real, muy por
encima del 50,4 de media de la categoría.

Lo que aquella guía no contaba es cuánto tiraba. Y la respuesta cambia bastante la
lectura: **Esteban está en el percentil 15 de uso**. El 85% de la categoría asume más
responsabilidad ofensiva que él. Promedia 9,0 puntos en 25,8 minutos.

¿Es un especialista infrautilizado o alguien que rinde así precisamente porque solo toma
los tiros que le salen bien? El porcentaje de uso no responde a eso. Pero sin él, la
pregunta ni siquiera se plantea.

## Qué mide exactamente

El **porcentaje de uso** —USG%— es la proporción de las posesiones de su equipo que
termina un jugador **mientras está en pista**. "Terminar" una posesión significa una de
tres cosas: tirar a canasta, ir a la línea de tiros libres, o perder el balón.

La clave está en lo de *mientras está en pista*. No mide cuánto participa en el partido,
sino cuánto pesa en el ataque durante los minutos que juega. Por eso un suplente puede
tener un uso altísimo: en sus quince minutos, el balón pasa por sus manos.

Y de ahí sale la cifra de referencia. Hay **cinco jugadores en pista y una sola pelota**,
así que los cinco usos suman aproximadamente 100. El reparto perfectamente equitativo
sería el 20% para cada uno. **El 20% es "tu parte"**: por encima, asumes más de lo que te
tocaría; por debajo, menos.

## La escala real de la categoría

Esa referencia teórica se cumple bien. En la Tercera FEB 2025/26, entre los 1.522
jugadores con doce partidos o más —el mismo mínimo que usan
[los percentiles](/guias/como-leer-percentiles/)—:

| | USG% |
|---|---|
| Mediana de la categoría | 19,1 |
| Percentil 10 | 12,5 |
| Percentil 90 | 25,7 |
| Máximo | 37,2 |

Solo **58 jugadores de 1.522 pasan del 28%**, un 3,8%: eso es lo que significa ser el
motor ofensivo de un equipo. Y 314 se quedan por debajo del 15%, que es el territorio de
los especialistas y los roles secundarios.

## Cómo se calcula

```
USG% = 100 × (TC intentados + 0,44 × TL intentados + Pérdidas) × (Minutos del equipo / 5)
       ───────────────────────────────────────────────────────────────────────────────────
       Minutos del jugador × (TC intentados + 0,44 × TL intentados + Pérdidas, del equipo)
```

El numerador cuenta las posesiones que termina el jugador; el denominador, las que
termina su equipo. Los "minutos del equipo dividido entre cinco" son simplemente los
minutos de partido disputados: cinco jugadores acumulan cinco minutos por cada minuto de
reloj, y dividir deshace esa multiplicación.

Aparece otra vez el **0,44**, que estima cuántas posesiones representan los tiros libres.
Es el mismo coeficiente que en
[la estimación de posesiones](/guias/ritmo-de-juego-pace/#posesiones), y aquí cumple el
mismo papel.

Una consecuencia que conviene tener presente: **las pérdidas cuentan como uso**. Un base
que pierde muchos balones tiene un uso alto aunque no tire, porque está terminando
posesiones de su equipo — mal, pero terminándolas.

## El cruce que de verdad importa: uso y eficiencia

Un uso alto no es bueno ni malo por sí mismo. Lo que informa es cruzarlo con lo que el
jugador produce con esas posesiones, y por eso el gráfico de dispersión de Pick&Stats
enfrenta por defecto el USG% con el [TS%](/guias/ts-efg-porcentaje-tiro/).

Tres jugadores de la misma categoría y la misma temporada dibujan tres esquinas
distintas:

| | USG% | TS% | Puntos |
|---|---|---|---|
| **Tyrone Perry** (Lithium Iberia Sagrado) | 32,4 | 60,0 | 22,2 |
| **Arturo Fernández** (Baloncesto Telde) | 32,1 | 47,7 | 17,0 |
| **Màxim Esteban** (Sandá L'Hospitalet) | 13,9 | 65,3 | 9,0 |

Perry y Fernández asumen prácticamente la misma carga —los dos entre los mejores del
país en volumen— y la rentabilizan de forma muy distinta: doce puntos de eficiencia
separan a uno del otro. Esteban está en la esquina opuesta: rendimiento excelente con una
carga pequeña.

Ninguno de los tres es "mejor" en abstracto. Perry es el perfil más valioso de los tres,
pero Fernández puede estar sosteniendo un ataque que no tiene a nadie más, y Esteban
podría no aguantar ese 65,3 si le dieran el doble de tiros. El cruce describe roles, no
establece un ranking.

## Un dato que va contra la intuición

En baloncesto se da por hecho que volumen y eficiencia se pelean: cuantos más tiros
asume alguien, más difíciles son y peor acierta. En la Tercera FEB 2025/26 **ocurre
justo lo contrario**:

| Tramo de USG% | Jugadores | TS% medio |
|---|---|---|
| Menos de 15 | 314 | 43,9 |
| 15 – 20 | 565 | 48,5 |
| 20 – 25 | 455 | 50,7 |
| 25 – 30 | 161 | 50,8 |
| 30 o más | 27 | **53,2** |

La correlación entre uso y eficiencia es **positiva** (r = +0,31): los que más tiran son,
de media, los que mejor tiran.

Antes de sacar la conclusión equivocada, conviene ver qué dice esto y qué no. **No dice
que tirar más te haga más eficiente.** Dice que en esta categoría los entrenadores le dan
el balón a quien mejor lo usa, y que la diferencia de nivel entre el mejor jugador de un
equipo y el último de la rotación es lo bastante grande como para tapar cualquier efecto
de desgaste. La causa va del talento al uso, no al revés.

Es un buen recordatorio de que las reglas heredadas de la NBA no se trasladan sin
comprobarlas.

## Lo que el uso no dice

**No mide calidad.** Es una cifra de reparto, no de rendimiento. Un uso del 30% con mala
eficiencia describe a un jugador que su equipo necesita más de lo que le conviene.

**Depende del equipo tanto como del jugador.** El mismo jugador en otra plantilla tendría
otro uso. Comparar usos entre equipos compara contextos, no solo talentos.

**No ajusta por posición.** Los interiores que viven de segundas oportunidades y los
bases que reparten juego tienden a usos más bajos que un exterior anotador, y eso es su
papel, no un defecto.

**Necesita muestra.** Como el resto de métricas de la aplicación, un uso calculado sobre
cuatro partidos describe esos cuatro partidos.

## Dónde verlo

En [Pick&Stats](/app/), el USG% está en la vista **Jugadores**, pestañas **Avanzada** y
**Per-40**, y en la ficha de cada jugador. Y sobre todo en la pestaña **Gráfico**, donde
es el eje horizontal por defecto, cruzado con la eficiencia real de tiro: la forma más
rápida de ver el mapa completo de una categoría.

---

Sigue por [TS% y eFG%](/guias/ts-efg-porcentaje-tiro/), que es la otra mitad de ese
cruce, o por [las estadísticas por 40 minutos](/guias/estadisticas-por-40-minutos/), que
resuelven el problema contrario: comparar producción cuando los minutos son distintos.
