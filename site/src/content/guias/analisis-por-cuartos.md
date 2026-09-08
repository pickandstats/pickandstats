---
titulo: El análisis por cuartos, en qué tramo del partido gana cada equipo
descripcion: Qué revela el rendimiento por cuarto de un equipo y de un jugador, qué mide exactamente la métrica de momentos decisivos, y por qué el marcador contamina los promedios del último cuarto. Con ejemplos reales de la Primera FEB.
descripcionSeo: Cómo leer el rendimiento por cuarto de equipos y jugadores, qué miden los momentos decisivos y por qué el marcador contamina los promedios.
familia: metricas
orden: 5
fecha: 2026-09-04
temporada: "2025/26"
---

El Inveready Gipuzkoa y el Alimerka Oviedo terminaron la Primera FEB 2025/26 con el
mismo balance: 19 victorias y 13 derrotas. Sus ratings de temporada también se parecen,
+7,3 y +6,0.

Pero no ganaban a la misma hora. Gipuzkoa sacaba doce puntos por cada 100 posesiones en
el primer cuarto y prácticamente nada en el último. Oviedo hacía justo lo contrario.

| Neto por cada 100 posesiones | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| **Inveready Gipuzkoa** | **+12,5** | +9,8 | +6,4 | +0,6 |
| **Alimerka Oviedo** | +3,2 | +0,9 | +6,0 | **+15,1** |

Dos equipos idénticos en la clasificación y opuestos en la forma de llegar ahí. Eso es
lo que añade el análisis por cuartos: no *cuánto* rinde un equipo, sino **cuándo**.

## Qué se mide

Lo mismo que en el resto de la aplicación, pero troceado. Cada cuarto tiene su
[rating ofensivo y defensivo](/guias/rating-ofensivo-defensivo/) —puntos anotados y
recibidos por cada 100 posesiones— y su propio ritmo, calculado con las posesiones de
ese cuarto y no del partido entero. Los detalles de cómo se estiman las posesiones están
en [la guía del ritmo de juego](/guias/ritmo-de-juego-pace/#posesiones).

Que sean ratings y no puntos importa: un cuarto en el que se juegan veinte posesiones y
otro en el que se juegan diecisiete no son comparables en puntos brutos, y sí en
eficiencia.

## La referencia: la liga es sorprendentemente plana

Antes de leer a un equipo conviene saber contra qué se le compara. En la Primera FEB
2025/26, promediando los diecisiete equipos:

| | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| Rating ofensivo | 107,3 | 107,4 | 107,0 | 107,0 |
| Ritmo (posesiones) | 18,8 | 18,8 | 18,6 | 18,6 |

**No existe un cuarto donde se anote más.** La eficiencia media es prácticamente la
misma en los cuatro, y el ritmo apenas se mueve. La idea de que los partidos "se abren"
al final, o de que el primer cuarto es de tanteo, no aparece en los datos agregados.

Eso tiene una consecuencia útil: cuando el perfil de un equipo no es plano, la
desviación es suya. No es un efecto del formato del partido.

## Cuatro perfiles, y trece equipos sin perfil

Pick&Stats marca un equipo como que **cierra fuerte** o que **le cuesta cerrar** cuando
su neto del último cuarto se separa seis puntos o más de la media de sus propios cuatro
cuartos. En toda la temporada 2025/26 solo lo dispararon cuatro de diecisiete:

| Equipo | Q1 | Q2 | Q3 | Q4 | Diferencia |
|---|---|---|---|---|---|
| Caja Rural CB Zamora | −9,7 | −13,4 | +2,7 | +6,1 | **+9,7** |
| Alimerka Oviedo | +3,2 | +0,9 | +6,0 | +15,1 | **+8,8** |
| Flexicar Fuenlabrada | −1,9 | −4,4 | +8,8 | −8,4 | **−6,9** |
| Inveready Gipuzkoa | +12,5 | +9,8 | +6,4 | +0,6 | **−6,7** |

Los otros trece son razonablemente los mismos en los cuatro cuartos, **y eso también es
información**: el Monbus Obradoiro, campeón con 28-4, dominó de principio a fin (+16,7,
+23,0, +17,4 y +25,0) sin ningún tramo débil. Un equipo plano y muy bueno no tiene un
problema de cierre que arreglar.

El caso del Fuenlabrada merece una mirada aparte: un tercer cuarto excelente (+8,8) y un
último cuarto de los peores de la liga (−8,4). Un perfil así apunta a algo concreto
—rotaciones, físico, gestión de las últimas posesiones— que la cifra de temporada,
−0,9 de neto, escondía por completo.

## El mismo corte, aplicado a un jugador

En la ficha de cada jugador, el rendimiento por cuarto muestra sus puntos y su
valoración medios en cada tramo. Sirve para lo mismo: distinguir a quién arranca fuerte
de quién crece con el partido.

**Marques Townes**, del Oviedo, promedió 2,6 puntos en el primer cuarto y 4,9 en el
último. Su equipo era el que más subía al final de los partidos, y la curva de su máximo
anotador —16,2 puntos por partido— cuenta la misma historia desde dentro. **Jayson
Granger**, del
Movistar Estudiantes, dibuja una curva parecida: 2,6, 3,0, 3,2 y 4,3.

## Momentos decisivos: el filtro que hace falta

Aquí está el matiz importante, y es la razón de que exista una métrica aparte.

**El promedio por cuarto está contaminado por el marcador.** En un partido resuelto, el
último cuarto lo juegan otros: los titulares descansan y los suplentes acumulan minutos.
Un jugador del Obradoiro como **Yunio Barrueta** promedia 3,8, 3,3 y 3,6 puntos en los
tres primeros cuartos y 1,0 en el último — en un equipo que ganaba de veinte con
frecuencia, esa caída dice más de los minutos que de él.

La métrica de **momentos decisivos** corrige justo eso. Cuenta los puntos y las
asistencias de un jugador en el último cuarto y las prórrogas, **pero solo de los
partidos que llegaron al último periodo con ocho puntos de diferencia o menos**: los que
todavía estaban en juego.

En la Primera FEB 2025/26, el mejor fue **Marques Townes**: 107 puntos y 15 asistencias
en 18 partidos ajustados, 6,8 por partido. Que lidere las dos lecturas —la curva por
cuarto y los momentos decisivos— es lo que convierte el dato en una conclusión y no en
una casualidad.

## Y el filtro tiene su propio límite

Filtrar por partidos ajustados deja muy pocos partidos. La mediana de la categoría fueron
**10 partidos ajustados por jugador**, y solo 183 de 275 jugadores llegaron a ocho.

Eso obliga a leer las cifras altas con cuidado. **Jordan Walker**, del HLA Alicante,
aparece con 6,6 puntos y asistencias por partido decisivo, casi al nivel de Townes —
pero sobre **8 partidos**, no 18. No es lo mismo. Por eso la ficha avisa explícitamente
cuando la muestra baja de cinco partidos: con tan pocos encuentros, el dato describe lo
que pasó, no lo que cabe esperar.

## Los otros límites

**No ajusta por minutos.** Ni el rendimiento por cuarto ni los momentos decisivos saben
cuánto tiempo estuvo el jugador en pista en ese tramo. Para comparar producción en
igualdad de tiempo están las
[estadísticas por 40 minutos](/guias/estadisticas-por-40-minutos/).

**El marcador también condiciona al equipo, aunque menos de lo que parece.** Es habitual
oír que los equipos que van por detrás disparan el ritmo del último cuarto, entre faltas
y reloj parado. En la Primera FEB 2025/26 el efecto existe pero es pequeño: **ningún
equipo varía más de 0,7 posesiones** entre su último cuarto y la media de los tres
primeros, y el que más acelera —Hestia Menorca— acabó en mitad de tabla, no colista.
Conviene no leer un ritmo alto en el último cuarto como prueba de que se va perdiendo.

**No ajusta por rival.** Un cuarto se juega contra quien toca, y ni el rendimiento por
cuarto ni los momentos decisivos corrigen la calidad del oponente.

**Los partidos de fases no cuentan.** Como en el resto de la aplicación, las fases de
ascenso van aparte y no entran en estos promedios.

## Dónde verlo

En [Pick&Stats](/app/), la eficiencia y el ritmo por cuarto de un equipo están en su
ficha, en la pestaña **Por cuartos**; la pestaña **Análisis** del mismo equipo incorpora
además la etiqueta de cierre cuando se cumple el umbral. El rendimiento por cuarto de un
jugador y sus momentos decisivos están en su ficha, también en **Por cuartos**.

---

Sigue por [el rating ofensivo y defensivo](/guias/rating-ofensivo-defensivo/), que es la
métrica que aquí se trocea, o por
[los Four Factors](/guias/four-factors-baloncesto/), que explican de dónde sale esa
eficiencia.
