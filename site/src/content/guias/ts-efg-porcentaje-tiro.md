---
titulo: TS% y eFG%, por qué el porcentaje de tiro engaña
descripcion: Qué miden el porcentaje efectivo de tiro y la eficiencia real, en qué se diferencian y por qué un jugador con buen porcentaje de dos puede ser ineficiente, con ejemplos de la Tercera FEB.
fecha: 2026-08-09
---

Un jugador de la Tercera FEB 2025/26 acertó el **56% de sus tiros de dos**. Suena
bien: está por encima de la media de la categoría, que ronda el 48%.

Pero ese mismo jugador también tiró triples, y ahí acertó un **9,8%**. Sumando todo,
su eficiencia real fue de las peores de la liga. El porcentaje de dos, aislado, no
contaba la historia.

## El problema: no todos los tiros valen lo mismo

El porcentaje de tiro de campo trata igual a un triple y a una bandeja. Pero uno vale
tres puntos y el otro dos, así que **acertar el 40% desde el triple produce más que
acertar el 50% desde dos**: 1,2 puntos por intento frente a 1,0.

Y hay una tercera vía de anotar que ese porcentaje ignora por completo: los tiros
libres, que son los puntos más eficientes que existen porque nadie te defiende.

De ahí salen dos métricas que corrigen el problema, cada una a su manera.

## eFG%: el tiro de campo, con el triple bien valorado

El **porcentaje efectivo de tiro** corrige lo primero: da al triple el peso que le
corresponde, contándolo como un tiro y medio.

```
eFG% = 100 × (Tiros de campo anotados + 0,5 × Triples anotados) / Tiros de campo intentados
```

El caso de **Thomas Yome** lo ilustra bien. Sus porcentajes por separado parecen
correctos —56,1% en dos, y en tiros libres un digno 66%— pero su 9,8% desde el triple
hunde el conjunto: su eFG queda en **36,6**, muy por debajo de la media de la
categoría (47,1).

El eFG revela lo que los porcentajes sueltos esconden: un jugador puede acertar bien
donde tira poco y fallar mucho donde tira a menudo.

## TS%: la eficiencia real, tiros libres incluidos

La **eficiencia real de tiro** va un paso más allá e incorpora los tiros libres. En
lugar de contar tiros, cuenta **puntos producidos por oportunidad de anotar**:

```
TS% = 100 × Puntos / (2 × (Tiros de campo intentados + 0,44 × Tiros libres intentados))
```

Ese 0,44 estima cuántas oportunidades de tiro representan los tiros libres, porque no
todos consumen una posesión completa —un tiro adicional tras canasta, por ejemplo.

La diferencia entre eFG y TS mide, en la práctica, **cuánto aporta un jugador desde la
línea de personal**. Y puede ser enorme: **José Luis Sáez** tuvo un eFG de 42,4, malo,
pero su TS subió hasta **56,1**. Casi catorce puntos de diferencia, porque acude mucho
al tiro libre y acierta el 71,7%. Juzgarlo solo por su tiro de campo sería injusto.

## Lo que revelan juntos

El contraste más útil aparece al comparar perfiles opuestos:

| | T2% | T3% | eFG% | TS% |
|---|---|---|---|---|
| **Màxim Esteban** | 46,8 | 46,7 | **63,0** | **65,3** |
| **Daniel Salvador** | 59,6 | 21,4 | 41,5 | 46,5 |

Salvador acierta trece puntos más en tiros de dos. Cualquiera diría que tira mejor. Y
sin embargo Esteban produce muchísimo más por intento, porque su volumen está en el
triple y lo mete casi la mitad de las veces.

Es exactamente el tipo de lectura que las estadísticas básicas no permiten.

## Cómo se leen las cifras

En la Tercera FEB 2025/26, las medias de la categoría fueron **47,1 de eFG** y **50,4
de TS**. Como referencia general:

- Por encima de **58 de TS** es tiro de élite
- Alrededor de **50** es la media
- Por debajo de **45** indica un problema de eficiencia

Ojo con comparar entre categorías o entre competiciones: cada liga tiene su nivel, y
lo que aquí es notable en otra puede ser corriente.

## Cuál usar

**El TS% es la medida más completa** de eficiencia anotadora, porque incluye todo lo
que produce puntos. Si solo vas a mirar una, mira esa.

**El eFG% aísla el tiro de campo**, y es útil cuando quieres separar la calidad de
lanzamiento del hábito de ir a la línea. Un jugador puede tener buen TS a base de
tiros libres sin ser buen tirador.

Y ninguna de las dos dice **cuánto** tira un jugador. Una eficiencia altísima con
cinco tiros por partido no es lo mismo que la misma eficiencia asumiendo veinte. Para
eso está el porcentaje de uso, que se lee junto a estas dos: es el cruce que aparece
por defecto en el gráfico de dispersión de la aplicación.

## Cómo se relaciona con el resto

El eFG% es el primero de los
[Four Factors](/guias/four-factors-baloncesto), el que más peso tiene en el resultado
de un partido. Y ambas métricas alimentan
[el rating ofensivo](/guias/rating-ofensivo-defensivo), que mide la eficiencia del
equipo entero por cada 100 posesiones.

## Dónde verlas

En [Pick&Stats](/app/), el TS% y el eFG% están en la vista **Jugadores**, pestaña
**Avanzada**, y en la ficha de cada jugador dentro del modo **Detalle**. También como
uno de los ejes del gráfico de dispersión, donde cruzarlas con el uso dibuja el perfil
anotador de toda la categoría de un vistazo.

---

Sigue por [los Four Factors](/guias/four-factors-baloncesto), donde el tiro efectivo
es el factor que más decide los partidos.
