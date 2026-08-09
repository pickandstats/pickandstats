---
titulo: Rating ofensivo y defensivo, la forma correcta de medir a un equipo
descripcion: Qué son el rating ofensivo, el defensivo y el neto, por qué los puntos por partido engañan y cómo leerlos, con ejemplos reales de la Primera FEB.
fecha: 2026-07-27
---

Dos equipos de la Primera FEB 2025/26 anotaron exactamente lo mismo: 83,6 puntos por
partido. Uno acabó tercero con 25 victorias; el otro, décimo con 15. Y no es que uno
defendiera mucho mejor: la diferencia estaba en el propio ataque, aunque los promedios
dijeran que eran iguales.

Los puntos por partido son la estadística más citada del baloncesto y una de las que
peor informa. El rating ofensivo y defensivo existen para arreglar eso.

## El problema: no todos los partidos tienen las mismas oportunidades

Un partido de baloncesto no dura un número fijo de ataques. Depende de cómo jueguen los
dos equipos: si corren, si atacan rápido, si fuerzan pérdidas. Un equipo que juega a un
ritmo alto tendrá más posesiones y, por tanto, anotará más puntos **aunque sea peor
atacando**.

Volvamos al ejemplo. En 2025/26, el [Caja Rural CB Zamora](/app/primerafeb/2025/equipo/zamora)
y el [Súper Agropal Palencia](/app/primerafeb/2025/equipo/palencia) promediaron los mismos
83,6 puntos. Pero Zamora jugó a 78,5 posesiones por partido —el ritmo más alto de la
categoría— y Palencia a 74,4. Zamora necesitaba **cuatro ataques más** cada noche para
llegar a la misma cifra.

Traducido a eficiencia: Palencia sacaba 112,4 puntos por cada 100 posesiones y Zamora
solo 106,4. Seis puntos de diferencia que el promedio por partido escondía por completo.

## La solución: puntos por cada 100 posesiones

El **rating ofensivo** mide cuántos puntos anota un equipo por cada 100 posesiones. El
**rating defensivo**, cuántos recibe. Al fijar el denominador en 100, el ritmo deja de
importar y todos los equipos se comparan con la misma vara.

Las cifras se leen en una escala reconocible. En la Primera FEB 2025/26:

- Por encima de **115** es un ataque de élite
- Alrededor de **107** es la media de la categoría
- Por debajo de **100** es un ataque con problemas serios

Y en defensa, al revés: **menos es mejor**. Bajar de 100 puntos encajados por cada 100
posesiones es rendimiento de equipo de arriba.

## El rating neto: la medida más honesta

Restando uno del otro sale el **rating neto**, que es probablemente el mejor número
individual para juzgar a un equipo. Dice cuántos puntos gana o pierde por cada 100
posesiones jugadas.

Un neto positivo significa que superas a tus rivales; negativo, que te superan a ti. Y
su magnitud da la escala de la superioridad.

## Lo que revela: cuatro lecturas de una misma liga

**El dominio real del campeón.** El [Monbus Obradoiro](/app/primerafeb/2025/equipo/obradoiro)
y el [Leyma Coruña](/app/primerafeb/2025/equipo/leyma-coruna) acabaron la liga regular
empatados a 28-4. La clasificación decía que eran iguales. Los ratings, no: Obradoiro
tuvo un neto de **+20,6** y Leyma de **+13,6**. Siete puntos por cada 100 posesiones es
un abismo. El Obradoiro fue bastante más dominante de lo que sugería el balance.

**Un tercero que valía como un segundo.** Palencia terminó con tres victorias menos que
el Leyma, pero su rating neto (**+13,8**) fue *ligeramente superior* al del Leyma
(+13,6). En rendimiento puro fueron equivalentes; la diferencia en la clasificación se
explica por otras cosas —calendario, partidos ajustados— más que por ser peor equipo.

**Un ataque bueno escondido en la zona baja.** El
[Grupo Ureta Tizona Burgos](/app/primerafeb/2025/equipo/tizona) acabó 10-22, en puestos
de descenso. Pero su rating ofensivo fue de 107,5, mejor que el del
[Alimerka Oviedo](/app/primerafeb/2025/equipo/oviedo), que quedó 19-13. El problema del
Tizona no era atacar: era su defensa, la peor de la liga con 114,1. Un dato así cambia
por completo qué hay que arreglar en ese equipo.

**Quién defendía de verdad.** El [Inveready Gipuzkoa](/app/primerafeb/2025/equipo/gipuzkoa)
y Palencia fueron los mejores defensivamente, con 100,7 y 98,6. Palencia fue el único
equipo de la categoría que bajó de 100.

## Un aviso sobre la escala

Los ratings de la Primera FEB no son directamente comparables con los de la ACB o la
NBA. Cada competición tiene su propio nivel de anotación, y lo que en una liga es un
ataque medio en otra puede ser excelente.

Compara siempre **dentro de la misma categoría y temporada**. En Pick&Stats, los
percentiles hacen ese trabajo automáticamente: te dicen dónde está un equipo respecto a
sus rivales reales, no respecto a una referencia abstracta.

## Las fórmulas

Todo se apoya en una estimación de las posesiones, porque el acta no las registra:

```
Posesiones = Tiros de campo intentados − Rebotes ofensivos + Pérdidas + 0,44 × Tiros libres intentados
```

Y a partir de ahí:

```
Ritmo (Pace)      = Posesiones / Partidos jugados
Rating ofensivo   = 100 × Puntos a favor / Posesiones propias
Rating defensivo  = 100 × Puntos en contra / Posesiones del rival
Rating neto       = Rating ofensivo − Rating defensivo
```

El rating defensivo usa las posesiones **del rival**, no las propias, porque son ataques
distintos. En la práctica ambas cifras son muy parecidas —las posesiones se alternan—
pero no idénticas.

## Cómo se relacionan con los Four Factors

Los ratings dicen **cuánto** de eficiente es un equipo. Los
[Four Factors](/guias/four-factors-baloncesto/) explican **por qué**: si ese ataque
funciona por acierto en el tiro, por cuidar el balón, por rebote ofensivo o por vivir en
la línea de personal.

Se leen juntos. El rating te dice que el Obradoiro atacaba mejor que nadie; los factores
te dicen que era por su porcentaje efectivo de tiro, el mejor de la liga.

## Dónde verlos

En [Pick&Stats](/app/), el rating ofensivo, el defensivo y el neto están en la vista
**Equipos**, pestaña **Avanzada**, junto al ritmo y al resto de métricas de contexto.
También en la ficha individual de cada equipo.

---

Sigue por [los Four Factors](/guias/four-factors-baloncesto/), que explican de dónde sale
la eficiencia de un ataque.
