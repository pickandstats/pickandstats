const SECCIONES = [
  {
    titulo: 'Estadística básica',
    metricas: [
      ['PF / PC por partido', 'Puntos a favor y en contra por encuentro. La lectura más directa del nivel ofensivo y defensivo, aunque sin corregir por ritmo (para eso, ORtg y DRtg).'],
      ['Dif.', 'Diferencia media de puntos por partido (PF − PC). En verde si es positiva, en rojo si es negativa.'],
      ['PTS, REB, AST', 'Promedios por partido de puntos, rebotes totales y asistencias.'],
      ['RO / RD', 'Rebotes ofensivos y defensivos por partido, desglosados. RO + RD = REB.'],
      ['ROB / BP', 'Robos y pérdidas por partido. El balance entre ambos mide el cuidado del balón: los buenos equipos pierden pocos y roban muchos.'],
      ['FC / FR', 'Faltas cometidas y recibidas por partido. El balance FR−FC indica cuánto castiga un equipo o jugador al rival respecto a lo que le cuesta.'],
      ['TAP / TR', 'Tapones puestos (a favor) y recibidos (en contra) por partido.'],
      ['T2%, T3%, TL%', 'Porcentajes de acierto clásicos en tiros de 2, triples y tiros libres.'],
    ]
  },
  {
    titulo: 'Ritmo y eficiencia global',
    guias: [
      { url: '/guias/rating-ofensivo-defensivo', texto: 'Guía: rating ofensivo y defensivo' },
      { url: '/guias/ritmo-de-juego-pace', texto: 'Guía: el ritmo de juego' },
      { url: '/guias/srs-rating-ajustado', texto: 'Guía: el SRS (rating ajustado)' },
    ],
    metricas: [
      ['Pace', 'Posesiones por partido. Estimadas como tiros de campo intentados − rebotes ofensivos + pérdidas + 0,44 × tiros libres intentados. Define el estilo: rápido o pausado. No es ni bueno ni malo.'],
      ['ORtg (rating ofensivo)', 'Puntos anotados por cada 100 posesiones. Mide la eficiencia del ataque con independencia del ritmo.'],
      ['DRtg (rating defensivo)', 'Puntos encajados por cada 100 posesiones del rival. Cuanto más bajo, mejor.'],
      ['Net Rating', 'ORtg − DRtg. La medida global de dominio de un equipo por 100 posesiones.'],
      ['SRS (rating ajustado)', 'Net Rating corregido por la dificultad del calendario: suma la media del SRS de los rivales a los que te has enfrentado. Con dos límites que conviene tener claros. En liga regular no hay partidos entre grupos, así que solo es comparable entre equipos del mismo grupo. Y con la liga terminada, donde todos han jugado contra todos las mismas veces, el ajuste se reduce a "no te enfrentas a ti mismo" y no altera el orden respecto al Net Rating: el SRS aporta a mitad de temporada, cuando los calendarios todavía están desequilibrados.'],
    ]
  },
  {
    titulo: 'Four Factors (ataque)',
    guias: [{ url: '/guias/four-factors-baloncesto', texto: 'Guía: los Four Factors' }],
    metricas: [
      ['eFG% (tiro efectivo)', 'Porcentaje de tiro de campo que da valor 1,5 a los triples: (TC anotados + 0,5 × T3 anotados) / TC intentados. El factor más determinante para ganar.'],
      ['TOV% (pérdidas)', 'Pérdidas por cada 100 posesiones. Menos es mejor. Es la versión ajustada por ritmo del BP por partido de la básica.'],
      ['ORB% (rebote ofensivo)', 'Porcentaje de rebotes ofensivos capturados sobre los disponibles (tus RO / (tus RO + RD del rival)). Segundas oportunidades.'],
      ['FTr (tiros libres)', 'Tiros libres intentados por cada 100 tiros de campo. Mide la capacidad de generar faltas y llegar a la línea.'],
    ]
  },
  {
    titulo: 'Four Factors (defensa)',
    guias: [{ url: '/guias/four-factors-baloncesto', texto: 'Guía: los Four Factors' }],
    metricas: [
      ['eFG% rival', 'El tiro efectivo que permites al rival. El corazón de una buena defensa.'],
      ['TOV forzadas', 'Pérdidas del rival por cada 100 posesiones suyas. Defensas agresivas fuerzan más.'],
      ['DRB% (rebote defensivo)', 'Porcentaje del rebote defensivo asegurado (tus RD / (tus RD + RO del rival)). Cerrar la posesión rival con un solo tiro.'],
      ['FTr rival', 'Tiros libres que concede el rival por cada 100 tiros de campo suyos. Menos es mejor: defender sin hacer falta.'],
    ]
  },
  {
    titulo: 'Perfil de ataque',
    guias: [{ url: '/guias/ts-efg-porcentaje-tiro', texto: 'Guía: TS% y eFG%' }],
    metricas: [
      ['TS% (True Shooting)', 'Eficiencia total de anotación incluyendo tiros libres: puntos / (2 × (TC intentados + 0,44 × TL intentados)). La mejor medida individual de eficiencia anotadora.'],
      ['3PAr', 'Proporción de tiros de campo que son triples. Define el perfil: equipo triplista o interior.'],
      ['AST%', 'Porcentaje de canastas que llegan tras asistencia. Ataques corales altos, talento individual bajos.'],
      ['AS/BP', 'Asistencias por pérdida. Calidad en el cuidado del balón al generar juego.'],
      ['Reparto de puntos (%2 / %3 / %TL)', 'Qué porcentaje de los puntos del equipo llega desde el tiro de 2, el triple y el tiro libre.'],
    ]
  },
  {
    titulo: 'Forma y suerte',
    guias: [{ url: '/guias/victorias-esperadas-suerte', texto: 'Guía: victorias esperadas y suerte' }],
    metricas: [
      ['Últ. 5 (forma)', 'Récord de victorias-derrotas en los últimos 5 partidos disputados, con su diferencia media de puntos.'],
      ['Victorias esperadas (Pitágoras)', 'Las victorias que "deberías" tener según tus puntos anotados y encajados (fórmula pitagórica, exponente 10,25). Predice el futuro mejor que el récord real.'],
      ['Suerte', 'Victorias reales − esperadas. Un valor muy positivo suele indicar partidos ajustados ganados que tienden a equilibrarse; muy negativo, lo contrario. No es un juicio: es regresión a la media.'],
    ]
  },
  {
    titulo: 'Métricas de jugador',
    guias: [
      { url: '/guias/porcentaje-de-uso-usg', texto: 'Guía: el porcentaje de uso' },
      { url: '/guias/estadisticas-por-40-minutos', texto: 'Guía: las estadísticas por 40 minutos' },
    ],
    metricas: [
      ['VAL (valoración)', 'La valoración oficial FEB: suma de contribuciones positivas menos negativas. Útil pero mejorable; por eso la acompañamos de las siguientes.'],
      ['USG% (uso)', 'Porcentaje de las posesiones del equipo que termina el jugador (tiro, tiros libres o pérdida) mientras está en pista. Un rol normal ronda el 20%; las estrellas superan el 28%.'],
      ['Per-40', 'Producción proyectada a 40 minutos, la duración de un partido FIBA. Permite comparar titulares y suplentes en igualdad de minutos: revela a los jugadores de banquillo que producen como titulares. En fuentes de la NBA verás la variante por 36 minutos, un 10% más baja.'],
      ['+/-', 'Diferencia de puntos del equipo mientras el jugador está en pista, acumulada. Sensible al contexto: úsala con precaución.'],
      ['MIN tot.', 'Minutos totales disputados en la temporada, sumando todas las etapas si el jugador cambió de equipo.'],
      ['Con varias etapas', 'Si un jugador ha pasado por más de un equipo en la misma temporada, los promedios de la ficha combinan todas sus etapas. El USG% y las métricas por 40 minutos se ponderan por los minutos jugados en cada una, así que son una buena aproximación al valor de la temporada completa, no un recálculo exacto desde los totales.'],
    ]
  },
  {
    titulo: 'Percentiles',
    guias: [{ url: '/guias/como-leer-percentiles', texto: 'Guía: cómo leer los percentiles' }],
    metricas: [
      ['Qué son', 'En la ficha de cada jugador, las barras de percentil sitúan su rendimiento frente al resto. Un percentil 80 significa que el jugador supera al 80% de los comparables en esa métrica. Es la forma más rápida de leer un perfil de un vistazo.'],
      ['Nacional vs. grupo', 'Cada métrica se muestra con dos referencias: el percentil respecto a todos los jugadores de la categoría (nacional) y respecto a los de su grupo. La comparación de grupo es más justa para valorar el papel de un jugador en su contexto competitivo.'],
      ['Código de color', 'Verde para percentiles altos (élite, 80+), pasando por tonos intermedios, hasta rojo para los bajos (por debajo de 20). Solo se calculan para jugadores con un mínimo de 12 partidos disputados, para que la muestra sea significativa.'],
    ]
  },
  {
    titulo: 'Clasificación y desempates',
    guias: [{ url: '/guias/average-particular-desempates-feb', texto: 'Guía: los desempates de la FEB' }],
    metricas: [
      ['Cómo se ordena la tabla', 'Los equipos se ordenan por victorias. En las competiciones FEB no se suman dos puntos por victoria y uno por derrota: la clasificación es un balance, no un marcador de puntos. Cuando dos o más equipos empatan a victorias, el desempate sigue el artículo 84 del Reglamento General y de Competiciones.'],
      ['Los dos regímenes', 'El artículo 84 no tiene una lista de criterios, tiene dos. Hasta el final de la primera vuelta mandan la diferencia y el cociente generales de puntos, y el enfrentamiento directo entre los empatados es solo el tercer criterio. Desde el inicio de la segunda vuelta se invierte: manda el enfrentamiento directo, y lo general no se mira hasta el cuarto. Por eso un mismo empate puede ordenarse de dos formas distintas según la jornada que estés mirando.'],
      ['La regla del 2-0', 'Un equipo que arrastre un tanteo de 2-0 en contra —una incomparecencia o una sanción que acabe en ese resultado— ocupa la última posición entre todos los equipos empatados a victorias con él, independientemente de los resultados que haya conseguido contra ellos.'],
    ]
  },
  {
    titulo: 'Fases de ascenso',
    guias: [{ url: '/guias/#competicion', texto: 'Guías: cómo funciona la competición' }],
    metricas: [
      ['Qué son', 'Al terminar la liga regular, los mejores equipos disputan las fases de ascenso a Segunda FEB. El formato ha variado por temporada: finales de conferencia entre campeones de grupo, eliminatorias por conferencia, y unas Fases Finales con liguillas de cuatro equipos en dos sedes.'],
      ['Cómo se asciende', 'Ascienden los campeones de cada liguilla de las Fases Finales más los ganadores de los cruces entre los segundos clasificados: seis plazas en total.'],
      ['Ida y vuelta', 'En las eliminatorias a doble partido no decide quién gana cada encuentro, sino el marcador global sumando ida y vuelta (por eso puede haber empates en un partido individual).'],
      ['No cuentan en las estadísticas', 'Los partidos de fases se muestran como sección aparte y no computan en las medias, ratings ni percentiles de temporada regular: son pocos encuentros contra rivales de nivel alto y distorsionarían las cifras calibradas sobre la liga.'],
    ]
  },
  {
    titulo: 'Análisis por cuartos',
    guias: [{ url: '/guias/analisis-por-cuartos', texto: 'Guía: el análisis por cuartos' }],
    metricas: [
      ['Rendimiento por cuarto (jugador)', 'Producción media (puntos, valoración) en cada cuarto a lo largo de la temporada. Revela si un jugador arranca fuerte, crece con el partido o baja en los tramos finales.'],
      ['Momentos decisivos (clutch)', 'Puntos y asistencias en el último cuarto y prórrogas de los partidos que llegaron al último periodo con 8 puntos de diferencia o menos: los que aún estaban en juego. Mide quién aparece cuando el partido se decide, anotando o generando. Es una métrica de muestra pequeña —se indica el número de partidos ajustados—: con pocos, tómala como orientativa.'],
      ['Eficiencia por cuarto (equipo)', 'Ataque (ORtg) y defensa (DRtg) por cada 100 posesiones, calculados para cada cuarto. Muestra en qué tramos del partido un equipo es fuerte o flojo; cuando el ataque supera a la defensa, gana ese cuarto.'],
      ['Ritmo por cuarto (equipo)', 'Posesiones en cada cuarto, con el total del partido como referencia. Indica si un equipo acelera o frena el juego según el momento.'],
    ]
  },
];

export default function Leyenda() {
  return (
    <div>
      {SECCIONES.map(s => (
        <div key={s.titulo}>
          <h3 className="seccion">{s.titulo}</h3>
          {s.guias && (
            <p className="leyenda-guia">
              {s.guias.map((g, i) => (
                <span key={g.url}>
                  {i > 0 && ' · '}
                  <a href={g.url}>{g.texto} →</a>
                </span>
              ))}
            </p>
          )}
          <div className="leyenda-bloque">
            {s.metricas.map(([nombre, texto]) => (
              <div key={nombre} className="leyenda-item">
                <div className="leyenda-nombre">{nombre}</div>
                <div className="leyenda-texto">{texto}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="pie">
        Todas las métricas se calculan sobre partidos realmente disputados; los resueltos
        por sanción o incomparecencia cuentan en la clasificación pero no en las estadísticas.
      </p>
    </div>
  );
}
