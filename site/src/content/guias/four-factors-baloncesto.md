---
titulo: Los Four Factors, las cuatro cosas que deciden un partido de baloncesto
descripcion: Qué son los Four Factors, cómo se calculan y cómo leerlos, explicados con ejemplos reales de la Primera FEB. La forma más rápida de entender por qué gana un equipo.
fecha: 2026-07-27
---

Dos equipos terminan la liga regular con el mismo balance, 28 victorias y 4 derrotas.
Miras la clasificación y son idénticos. Miras los Four Factors y descubres que ganan
por motivos completamente distintos: uno porque tira mejor que nadie, el otro porque
no pierde balones y machaca el rebote ofensivo.

Eso es lo que aportan estas cuatro métricas: no *cuánto* gana un equipo, sino **por qué**.

## De dónde salen

Los propuso Dean Oliver a principios de los 2000 buscando responder a una pregunta
sencilla: de todo lo que pasa en un partido, ¿qué es lo que de verdad decide el
resultado? Su conclusión fue que casi todo se reduce a cuatro cosas, y que además
tienen un orden de importancia bastante claro:

1. **Tirar bien** (el más importante con diferencia)
2. **No perder balones**
3. **Capturar el rebote ofensivo**
4. **Ir a la línea de tiros libres**

Cada factor se mide con un porcentaje, y cada uno tiene su cara defensiva: lo mismo,
pero aplicado a lo que hace el rival.

## Factor 1: el tiro (eFG%)

El porcentaje de acierto normal engaña, porque cuenta igual un triple que una bandeja.
El **porcentaje efectivo de tiro** lo corrige dando al triple el peso que le corresponde:
vale un 50% más, porque suma un punto más.

Es el factor que más pesa, y se nota en la clasificación. En la Primera FEB 2025/26 el
[**Monbus Obradoiro**](/app/primerafeb/2025/equipo/obradoiro) lideró la liga con un 57,6% de eFG, y terminó primero. En el otro
extremo, el **Palmer Basket Mallorca Palma** se quedó en un 45,6%: doce puntos de
diferencia, que en la práctica son unos cuantos partidos.

## Factor 2: las pérdidas (TOV%)

Mide qué porcentaje de tus ataques acaba en pérdida. Aquí **menos es mejor**, al
contrario que en el resto.

Un balón perdido es peor que un tiro fallado, porque el tiro fallado al menos puede
acabar en rebote ofensivo. La pérdida es una posesión tirada a la basura, y encima
suele regalar una canasta fácil al contrario.

El [**Leyma Coruña**](/app/primerafeb/2025/equipo/leyma-coruna) fue el mejor de la liga en 2025/26, con un 14,2%. Es decir, solo
uno de cada siete ataques se le escapaba sin tirar.

## Factor 3: el rebote ofensivo (ORB%)

No es cuántos rebotes ofensivos coges, sino **qué proporción de los disponibles**.
Coger 12 rebotes ofensivos en un partido donde fallaste 50 tiros no es lo mismo que
cogerlos habiendo fallado 25.

Es el factor que permite a un equipo compensar un mal día de tiro: si fallas pero
recuperas el balón, tienes otra oportunidad. El caso más claro de la liga es el
[**Cloud.gal Ourense**](/app/primerafeb/2025/equipo/ourense), que lideró el rebote ofensivo con un 37% pese a ser uno de los
peores tiradores de la categoría. Una cosa compensaba la otra.

## Factor 4: los tiros libres (FT Rate)

Mide con qué frecuencia un equipo llega a la línea de personal en relación con los
tiros que intenta. Es el factor menos determinante de los cuatro, pero no es
irrelevante: los tiros libres son los puntos más eficientes que existen, porque nadie
te defiende.

Suele indicar un estilo de juego: equipos que atacan el aro en lugar de vivir del tiro
exterior. En 2025/26 lideró el [Caja Rural CB Zamora](/app/primerafeb/2025/equipo/zamora)
con un 38,1%, por delante del Grupo Alega Cantabria (37,4%).

## La cara defensiva

Los mismos cuatro factores, medidos sobre lo que hace el rival, describen la defensa:

- **eFG% del rival**: si le obligas a tirar mal
- **Pérdidas forzadas**: si le robas balones
- **DRB%**: qué proporción del rebote defensivo capturas, negándole segundas opciones
- **FT Rate del rival**: si le regalas tiros libres

El **Inveready Gipuzkoa** fue el mejor de la liga limitando el tiro rival, a un 46,7%
de eFG. El **Alimerka Oviedo** dominó el rebote defensivo con un 74,6%.

## Cómo se leen juntos: dos formas de ganar

Aquí está lo interesante. El Obradoiro y el Leyma acabaron la liga regular 2025/26 con
el mismo balance, 28-4. Pero sus perfiles no se parecen en nada:

| | Obradoiro | Leyma |
|---|---|---|
| eFG% | **57,6** | 53,9 |
| TOV% | 14,9 | **14,2** |
| ORB% | 32,1 | **35,3** |
| FT Rate | **36,3** | 34,0 |

El Obradoiro ganó **tirando mejor que nadie**: el mejor eFG de la liga, con diferencia.
El Leyma llegó al mismo sitio por otro camino: tirando bien pero no de forma
excepcional, y compensándolo con el mejor cuidado del balón de la categoría y un
rebote ofensivo muy superior.

Son dos maneras legítimas de construir un equipo ganador, y la clasificación por sí
sola no te las distingue. Los Four Factors sí.

## Un matiz importante: el ritmo

Los cuatro factores son porcentajes, así que **no dependen del ritmo de juego**. Eso es
justo lo que los hace útiles.

Un equipo que juega rápido acumula más posesiones y, por tanto, más puntos, más
rebotes y más pérdidas en términos absolutos. Comparar totales entre un equipo de ritmo
alto y otro de ritmo bajo no dice nada. En 2025/26, el **Caja Rural CB Zamora** jugó a
78,5 posesiones por partido y el **Hestia Menorca** a 72,6: seis posesiones de
diferencia que distorsionan cualquier estadística acumulada.

Los porcentajes eliminan ese ruido y permiten comparar a todo el mundo con la misma vara.

## Las fórmulas exactas

Distintas webs publican números diferentes para la misma métrica, porque no todas
usan la misma convención. Estas son las que aplica Pick&Stats, para que puedas
comprobar los cálculos o compararlos con otra fuente sabiendo dónde está la diferencia.

**Posesiones.** Todo lo demás se apoya en esta estimación, porque el acta no registra
las posesiones directamente:

```
Posesiones = Tiros de campo intentados − Rebotes ofensivos + Pérdidas + 0,44 × Tiros libres intentados
```

Ese 0,44 estima qué proporción de tiros libres termina realmente una posesión. No todos
lo hacen: un tiro adicional tras canasta, o un técnico, no consumen posesión completa.
Es el coeficiente más usado, aunque algunas implementaciones prefieren 0,475.

**Los cuatro factores:**

```
eFG%    = 100 × (Tiros de campo anotados + 0,5 × Triples anotados) / Tiros de campo intentados
TOV%    = 100 × Pérdidas / Posesiones
ORB%    = 100 × Rebotes ofensivos / (Rebotes ofensivos propios + Rebotes defensivos del rival)
FT Rate = 100 × Tiros libres intentados / Tiros de campo intentados
```

Dos advertencias sobre estas dos últimas. El **ORB%** necesita los rebotes defensivos
del rival, así que se calcula partido a partido y se agrega, no sobre totales sueltos.
Y el **FT Rate** usa los tiros libres **intentados**, que es la convención más extendida:
mide la capacidad de llegar a la línea, no el acierto una vez allí. La formulación original
de Dean Oliver usaba los anotados, así que algunas fuentes publican cifras más bajas.

**Las métricas de contexto** que aparecen junto a los factores:

```
Ritmo (Pace)      = Posesiones / Partidos jugados
Rating ofensivo   = 100 × Puntos a favor / Posesiones
Rating defensivo  = 100 × Puntos en contra / Posesiones del rival
Rating neto       = Rating ofensivo − Rating defensivo
```

Los ratings se expresan por cada 100 posesiones, que es lo que permite comparar equipos
de ritmos distintos con la misma vara.

## Dónde verlos

En [Pick&Stats](/app/) los Four Factors de cada equipo están en la vista **Equipos**, pestaña
**Avanzada**, junto a los del rival y al resto de métricas de contexto. También aparecen
en la ficha individual de cada equipo.

---

Estas otras guías completan la lectura:
[cómo se asciende y se desciende en Primera FEB](/guias/ascensos-y-descensos-primera-feb/)
y [los 18 equipos de la Primera FEB 2026/27](/guias/equipos-primera-feb-2026-27/).
