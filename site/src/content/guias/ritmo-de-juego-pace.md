---
titulo: El ritmo de juego, por qué los puntos por partido engañan
descripcion: Qué es el ritmo o pace en baloncesto, cómo se calcula y por qué dos equipos que anotan lo mismo pueden atacar de forma muy distinta, con ejemplos reales de la FEB.
descripcionSeo: Qué es el ritmo o pace, cómo se calcula y por qué dos equipos que anotan lo mismo pueden atacar de forma muy distinta. Ejemplos de la FEB.
familia: metricas
orden: 1
fecha: 2026-08-03
temporada: "2025/26"
---

En la Primera FEB 2025/26, el Súper Agropal Palencia y el Caja Rural CB Zamora
promediaron exactamente los mismos puntos: 83,6 por partido. Uno acabó tercero con
25 victorias; el otro, décimo con 15.

La explicación no está en la defensa. Está en que **no jugaron el mismo número de
ataques**.

## Un partido no dura un número fijo de ataques

Esta es la diferencia clave entre el baloncesto y otros deportes. Un partido de
fútbol dura noventa minutos y ya está; uno de baloncesto dura cuarenta, pero en esos
cuarenta minutos pueden caber setenta ataques o noventa, según cómo jueguen los dos
equipos.

Si corres, si atacas rápido, si fuerzas pérdidas y sales al contraataque, tendrás más
posesiones. Y con más posesiones anotarás más puntos **aunque ataques peor**.

El **ritmo** —o *pace*, como se le llama habitualmente— mide exactamente eso:
cuántas posesiones juega un equipo por partido.

## El caso de Palencia y Zamora

Los mismos 83,6 puntos, pero:

| | Palencia | Zamora |
|---|---|---|
| Ritmo | 74,4 posesiones | **78,5 posesiones** |
| Puntos por partido | 83,6 | 83,6 |
| Puntos por 100 posesiones | **112,4** | 106,4 |
| Balance | 25-7 | 15-17 |

Zamora necesitaba **cuatro ataques más cada noche** para llegar a la misma cifra. Su
ataque era claramente peor, pero el promedio por partido lo escondía por completo.

Cuando se mide lo que se anota por cada 100 posesiones —el
[rating ofensivo](/guias/rating-ofensivo-defensivo/)— la diferencia aparece: seis
puntos, que es un abismo.

## No es un caso aislado

En la misma temporada se repite el patrón:

- **HLA Alicante** (82,3 puntos, ritmo 74,5) atacaba mejor que el **Alimerka Oviedo**
  (82,1 puntos, ritmo 76,6), pese a que sus promedios parecían gemelos.
- El **Hestia Menorca**, el equipo más lento de la categoría con 72,6 posesiones,
  promedió 80,4 puntos. El **Flexicar Fuenlabrada**, con casi el mismo promedio
  (79,8), jugaba a 75,9. En eficiencia real, Menorca sacaba casi seis puntos por cada
  100 posesiones al Fuenlabrada.

## El ritmo no es bueno ni malo

Aquí conviene un matiz importante, porque es fácil interpretarlo mal: **el ritmo
describe un estilo, no una calidad**.

En la Primera FEB 2025/26, los dos equipos que acabaron primeros —Monbus Obradoiro
(76,8) y Leyma Coruña (77,3)— estaban entre los más rápidos. Pero el tercero,
Palencia (74,4), estaba por debajo de la media. Y el equipo más lento, Menorca,
acabó séptimo, mientras que el más rápido, Zamora, fue décimo.

Se gana corriendo y se gana pausando. Lo que no se puede es **juzgar un ataque por
sus puntos** sin saber a qué ritmo se consiguieron.

Por eso en Pick&Stats el ritmo no se colorea como bueno o malo: es contexto para
leer el resto, no una métrica de rendimiento.

## Cada categoría tiene su ritmo

Otro motivo para no comparar promedios a la ligera: **el ritmo típico cambia según
la competición**.

| Categoría | Ritmo mínimo | Media | Máximo |
|---|---|---|---|
| Primera FEB | 72,6 | **75,4** | 78,5 |
| Tercera FEB | 75,7 | **81,3** | 88,7 |

La Tercera FEB juega casi **seis posesiones más por partido** que la Primera. Tiene
sentido: menos control táctico, defensas menos organizadas, más transiciones. Pero
significa que un equipo de Tercera que promedie 85 puntos no está atacando mejor que
uno de Primera con 82 — probablemente al revés.

Compara siempre dentro de la misma categoría y temporada.

<span id="posesiones"></span>

## Cómo se estiman las posesiones

El acta de un partido no registra las posesiones, así que hay que estimarlas. Es el
cálculo del que dependen casi todas las métricas avanzadas de esta web —los ratings,
las pérdidas por posesión, la eficiencia de tiro—, así que vive en este apartado y el
resto de guías enlazan aquí. La fórmula estándar cuenta las formas en que un ataque
puede terminar:

```
Posesiones = Tiros de campo intentados − Rebotes ofensivos + Pérdidas + 0,44 × Tiros libres intentados

Ritmo = Posesiones / Partidos jugados
```

La lógica es directa: cada ataque acaba en tiro, en pérdida o en tiros libres. Se
restan los rebotes ofensivos porque **no inician una posesión nueva**: son la misma
posesión que continúa.

El 0,44 estima qué proporción de tiros libres termina realmente una posesión. No
todos lo hacen: un tiro adicional tras canasta o un técnico no consumen posesión
completa. Es el coeficiente más usado, aunque algunas implementaciones prefieren
0,475.

## Cómo se relaciona con el resto

El ritmo es el **denominador** de casi todo lo demás. Los
[ratings ofensivo y defensivo](/guias/rating-ofensivo-defensivo/) miden puntos por
cada 100 posesiones; los [Four Factors](/guias/four-factors-baloncesto/) son
porcentajes que también neutralizan el ritmo.

Esa es justamente su virtud: al fijar el denominador, todas esas métricas permiten
comparar a un equipo que corre con otro que pausa, con la misma vara.

## Dónde verlo

En [Pick&Stats](/app/), el ritmo está en la vista **Equipos**, pestaña
**Eficiencia**, junto a los ratings y al resto de métricas de contexto. También en la
ficha individual de cada equipo, en el modo **Análisis**.

---

Sigue por [el rating ofensivo y defensivo](/guias/rating-ofensivo-defensivo/), que es
la métrica que el ritmo hace posible.
