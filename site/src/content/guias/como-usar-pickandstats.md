---
titulo: Cómo usar Pick&Stats, seis preguntas y dónde se responden
descripcion: "La aplicación tiene siete pestañas y casi todo el mundo usa dos. Esta guía no es un recorrido por el menú, sino al revés: seis preguntas que te puedes hacer sobre un equipo o un jugador, y la herramienta que responde cada una, con lo que hace por dentro y con lo que no puede hacer."
descripcionSeo: "Guía práctica de Pick&Stats: clasificación por jornada, análisis de equipo, dossier de partido, radar, comparador y gráfico de dispersión."
familia: app
orden: 1
fecha: 2026-09-13
---

La aplicación tiene siete pestañas y la mayoría de la gente usa dos: la clasificación y la
ficha de su equipo. Es razonable, porque un menú no dice para qué sirve cada cosa.

Así que esta guía va al revés que un recorrido por el menú. Seis preguntas que te puedes
hacer de verdad sobre un equipo o un jugador, dónde se responde cada una, **qué hace la
herramienta por dentro** y dónde está su trampa.

## 1. «¿Cómo iba la liga en la jornada 12?»

**Clasificación → selector de jornada.**

La tabla no es solo la de hoy. El selector de jornada la **recalcula entera** en cualquier
punto de la temporada: victorias, puntos, diferencia y desempates, como estaban ese día.
Sirve para reconstruir una racha, ver cuándo un equipo se descolgó, o comprobar si el
susto de noviembre era tan grave como parecía.

Hay un detalle que sorprende a casi todo el mundo: **el criterio de desempate cambia a
mitad de temporada**. Hasta el final de la primera vuelta manda la diferencia general de
puntos; desde el inicio de la segunda, el enfrentamiento directo. Si mueves el selector a
través de ese punto, verás equipos empatados que se adelantan unos a otros sin que haya
cambiado ningún resultado. No es un fallo: es el
[artículo 84 del reglamento](/guias/average-particular-desempates-feb/).

## 2. «¿Cómo juega este equipo?»

**Equipos → un equipo → pestaña Análisis.**

Aquí no hay una tabla: hay texto. La aplicación describe en prosa la identidad del equipo
(si corre o controla el tempo, si vive del triple o del juego interior, si comparte mucho
el balón), sus fortalezas, sus debilidades y cómo cierra los partidos.

**Lo que hace por dentro, y conviene saberlo:** compara cada métrica del equipo con la
**media de su grupo**, no con la de la categoría ni con un estándar absoluto. Una
desviación del 6% cuenta como «algo» y del 15% como «mucho».

De ahí sale el matiz importante: cuando lee «defensa muy fuerte», significa **muy fuerte
para su grupo**. En un grupo flojo eso puede ser menos de lo que parece, y por eso la
frase dice siempre «respecto a su grupo». Es la misma cautela que explica la
[guía de los percentiles](/guias/como-leer-percentiles/).

## 3. «Juego contra ellos el domingo»

**Equipos → tu equipo → pestaña Preparar partido → eliges rival.**

Esta es la herramienta que menos gente encuentra y la que más trabajo ahorra. Eliges un
rival de tu grupo y la aplicación monta un informe:

- **Así juega**, con su identidad descrita como en el punto anterior.
- **Jugadores a vigilar**: sus cuatro mejores por valoración, contando solo a quienes
  llevan al menos cinco partidos, para que un partido suelto no cuele a nadie.
- **El cruce de estilos**: tu ataque contra su defensa y su ataque contra tu defensa, que
  no es lo mismo que comparar los dos equipos en abstracto.
- **Claves del partido**: qué hacer con lo que has visto. Si su defensa del tiro es floja,
  buscar tiros abiertos; si sufre en el rebote defensivo, insistir en el rebote de ataque;
  si comete muchas faltas, atacar el aro.
- **Comparativa directa**, quince métricas una al lado de otra.

Arriba hay un **botón de imprimir**. Da igual que no tengas impresora: en el diálogo de
impresión, «Guardar como PDF» convierte el dossier en un archivo con el nombre del cruce
ya puesto, listo para mandar al grupo del equipo.

Un límite honesto: **solo se puede elegir rival del mismo grupo**, porque el informe
compara a los dos contra la media de ese grupo. Para un cruce de fases de ascenso, entre
equipos de grupos distintos, esa referencia común no existe.

## 4. «¿Este jugador es tan bueno como dicen?»

**Jugadores → un jugador → su radar.**

El radar dibuja seis ejes —puntos, rebotes, asistencias, robos, eficiencia (TS%) y
triple— pero **no con sus números, sino con sus percentiles**: cuanto más hacia fuera,
mejor respecto a los demás.

Tiene dos botones que cambian la respuesta por completo:

- **Nacional**: comparado con todos los jugadores de su categoría.
- **Su grupo**: comparado solo con los de su grupo.

Un jugador puede ser percentil 90 en su grupo y percentil 60 nacional. Las dos cosas son
ciertas, y cuál te interesa depende de la pregunta: para fichar, la nacional; para
preparar la jornada, la del grupo.

Y puedes **superponer a otro jugador** en el mismo radar, que es la forma rápida de ver si
dos perfiles se parecen o se complementan.

**La trampa:** los percentiles necesitan **al menos 12 partidos jugados**. Quien no llegue
no tiene percentiles calculados y no aparece en estas comparaciones. No es un olvido: con
seis partidos, un percentil dice más del azar que del jugador.

## 5. «Quiero comparar a estos dos (o cuatro)»

**Comparador**, con su interruptor de **Jugadores** o **Equipos**.

Eliges de dos a cuatro, de la categoría que sea, y obtienes una tabla con el valor por
partido y, debajo, el percentil; más un radar con los cuatro perfiles superpuestos.

Lo importante está en poder mezclar categorías, y en cómo hay que leerlo: **si comparas a
un jugador de Primera con uno de Tercera, el valor crudo no sirve**. Quince puntos por
partido en Tercera y quince en Primera no son lo mismo. El percentil sí es comparable,
porque cada uno está medido contra los suyos. La aplicación te lo avisa en cuanto mezclas
categorías, y resalta el mejor percentil de cada fila, no el mejor número.

## 6. «No sé qué busco, pero quiero ver algo»

**Jugadores → modo Gráfico.**

Es una nube de puntos donde eliges qué va en cada eje entre ocho métricas (uso,
eficiencia, eFG%, puntos, rebotes, asistencias, valoración, minutos). Cada jugador es un
punto y **el tamaño del punto son sus minutos por partido**, así que los titulares pesan
visualmente más que quien juega cinco minutos.

El cruce que más cuenta es el de siempre: **uso en un eje, eficiencia (TS%) en el otro.**
Arriba a la derecha están los que asumen mucho y además aciertan; abajo a la derecha, los
que asumen mucho sin acertar. Es
[el porcentaje de uso](/guias/porcentaje-de-uso-usg/) hecho dibujo.

**La trampa, y es la más fácil de pasar por alto:** las dos líneas de referencia que
cruzan el gráfico son **las medias de los jugadores que estén pasando el filtro en ese
momento**, no las de la categoría. Si filtras por un equipo, el centro se mueve al centro
de ese equipo, y «por encima de la media» pasa a significar «por encima de sus
compañeros». Muy útil si lo sabes; engañoso si no.

Los filtros de arriba —grupo, equipo, tramo de edad, mínimo de partidos— se aplican
también al gráfico. El de edad es el que más juego da: **Sub-22 cruzado con uso y
eficiencia** es una forma razonable de buscar a quién le están dando responsabilidad
pronto y la está aprovechando.

## Y dos sitios donde mirar cuando no sabes por dónde empezar

**Inicio** resume la temporada: los líderes en siete categorías, los equipos dominantes,
quién está en racha en los últimos cinco partidos y los últimos resultados. Todo se puede
filtrar por grupo.

**Leyenda** es el diccionario: qué significa cada abreviatura y cada métrica, con enlaces
a las guías que las explican a fondo.

## Lo que la aplicación no hace

Por si ahorra búsquedas:

- **No hay gráficos de tiro.** Harían falta las coordenadas de cada lanzamiento y la FEB
  no las publica.
- **No hay jugada a jugada.** El máximo detalle temporal es el cuarto, y viene de las
  actas parciales.
- **Las estadísticas salen de los partidos con acta.** Un partido resuelto por
  incomparecencia cuenta en la clasificación pero no tiene datos de juego, y la ficha del
  equipo lo avisa cuando pasa.
- **La clasificación es una reconstrucción** a partir de los resultados publicados. La
  oficial es la de la FEB.
- **Todo son datos de temporada regular.** Los partidos de fases de ascenso tienen su
  propia sección y no se mezclan con las medias.

---

Para entender los números que verás por el camino:
[los percentiles](/guias/como-leer-percentiles/),
[el ritmo de juego](/guias/ritmo-de-juego-pace/),
[los ratings ofensivo y defensivo](/guias/rating-ofensivo-defensivo/) y
[los Four Factors](/guias/four-factors-baloncesto/).
