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
    metricas: [
      ['Pace', 'Posesiones por partido. Estimadas como tiros de campo intentados − rebotes ofensivos + pérdidas + 0,44 × tiros libres intentados. Define el estilo: rápido o pausado. No es ni bueno ni malo.'],
      ['ORtg (rating ofensivo)', 'Puntos anotados por cada 100 posesiones. Mide la eficiencia del ataque con independencia del ritmo.'],
      ['DRtg (rating defensivo)', 'Puntos encajados por cada 100 posesiones del rival. Cuanto más bajo, mejor.'],
      ['Net Rating', 'ORtg − DRtg. La medida global de dominio de un equipo por 100 posesiones.'],
      ['SRS (rating ajustado)', 'Net Rating corregido por la dificultad del calendario: suma la media del SRS de los rivales a los que te has enfrentado. Importante: en liga regular no hay partidos entre grupos, así que el SRS solo es comparable entre equipos del mismo grupo.'],
    ]
  },
  {
    titulo: 'Four Factors (ataque)',
    metricas: [
      ['eFG% (tiro efectivo)', 'Porcentaje de tiro de campo que da valor 1,5 a los triples: (TC anotados + 0,5 × T3 anotados) / TC intentados. El factor más determinante para ganar.'],
      ['TOV% (pérdidas)', 'Pérdidas por cada 100 posesiones. Menos es mejor. Es la versión ajustada por ritmo del BP por partido de la básica.'],
      ['ORB% (rebote ofensivo)', 'Porcentaje de rebotes ofensivos capturados sobre los disponibles (tus RO / (tus RO + RD del rival)). Segundas oportunidades.'],
      ['FTr (tiros libres)', 'Tiros libres intentados por cada 100 tiros de campo. Capacidad de generar faltas y puntos fáciles.'],
    ]
  },
  {
    titulo: 'Four Factors (defensa)',
    metricas: [
      ['eFG% rival', 'El tiro efectivo que permites al rival. El corazón de una buena defensa.'],
      ['TOV forzadas', 'Pérdidas del rival por cada 100 posesiones suyas. Defensas agresivas fuerzan más.'],
      ['DRB% (rebote defensivo)', 'Porcentaje del rebote defensivo asegurado (tus RD / (tus RD + RO del rival)). Cerrar la posesión rival con un solo tiro.'],
      ['FTr rival', 'Tiros libres que concedes por cada 100 tiros de campo del rival. Menos es mejor: defender sin hacer falta.'],
    ]
  },
  {
    titulo: 'Perfil de ataque',
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
    metricas: [
      ['Últ. 5 (forma)', 'Récord de victorias-derrotas en los últimos 5 partidos disputados, con su diferencia media de puntos.'],
      ['Victorias esperadas (Pitágoras)', 'Las victorias que "deberías" tener según tus puntos anotados y encajados (fórmula pitagórica, exponente 10,25). Predice el futuro mejor que el récord real.'],
      ['Suerte', 'Victorias reales − esperadas. Un valor muy positivo suele indicar partidos ajustados ganados que tienden a equilibrarse; muy negativo, lo contrario. No es un juicio: es regresión a la media.'],
    ]
  },
  {
    titulo: 'Métricas de jugador',
    metricas: [
      ['VAL (valoración)', 'La valoración oficial FEB: suma de contribuciones positivas menos negativas. Útil pero mejorable; por eso la acompañamos de las siguientes.'],
      ['USG% (uso)', 'Porcentaje de las posesiones del equipo que termina el jugador (tiro, tiros libres o pérdida) mientras está en pista. Un rol normal ronda el 20%; las estrellas superan el 28%.'],
      ['Per-36', 'Producción proyectada a 36 minutos. Permite comparar titulares y suplentes en igualdad de minutos: revela a los jugadores de banquillo que producen como titulares.'],
      ['+/-', 'Diferencia de puntos del equipo mientras el jugador está en pista, acumulada. Sensible al contexto: úsala con precaución.'],
    ]
  },
  {
    titulo: 'Percentiles',
    metricas: [
      ['Qué son', 'En la ficha de cada jugador, las barras de percentil sitúan su rendimiento frente al resto. Un percentil 80 significa que el jugador supera al 80% de los comparables en esa métrica. Es la forma más rápida de leer un perfil de un vistazo.'],
      ['Nacional vs. grupo', 'Cada métrica se muestra con dos referencias: el percentil respecto a todos los jugadores de la categoría (nacional) y respecto a los de su grupo. La comparación de grupo es más justa para valorar el papel de un jugador en su contexto competitivo.'],
      ['Código de color', 'Verde para percentiles altos (élite, 80+), pasando por tonos intermedios, hasta rojo para los bajos (por debajo de 20). Solo se calculan para jugadores con un mínimo de partidos disputados, para que la muestra sea significativa.'],
    ]
  },
  {
    titulo: 'Clasificación y desempates',
    metricas: [
      ['Average particular', 'Cuando dos o más equipos empatan a victorias, la clasificación no los ordena por diferencia general de puntos, sino por los resultados de los partidos entre ellos (enfrentamiento directo), siguiendo el criterio de la FEB. En empates múltiples se resuelve de forma iterativa. Si el particular no basta (equipos que aún no se han enfrentado), se recurre a la diferencia general.'],
    ]
  },
  {
    titulo: 'Fases de ascenso',
    metricas: [
      ['Qué son', 'Al terminar la liga regular, los mejores equipos disputan las fases de ascenso a Segunda FEB. El formato ha variado por temporada: finales de conferencia entre campeones de grupo, eliminatorias por conferencia, y unas Fases Finales con liguillas de cuatro equipos en dos sedes.'],
      ['Cómo se asciende', 'Ascienden los campeones de cada liguilla de las Fases Finales más los ganadores de los cruces entre los segundos clasificados: seis plazas en total.'],
      ['Ida y vuelta', 'En las eliminatorias a doble partido no decide quién gana cada encuentro, sino el marcador global sumando ida y vuelta (por eso puede haber empates en un partido individual).'],
      ['No cuentan en las estadísticas', 'Los partidos de fases se muestran como sección aparte y no computan en las medias, ratings ni percentiles de temporada regular: son pocos encuentros contra rivales de nivel alto y distorsionarían las cifras calibradas sobre la liga.'],
    ]
  },
];

export default function Leyenda() {
  return (
    <div>
      {SECCIONES.map(s => (
        <div key={s.titulo}>
          <h3 className="seccion">{s.titulo}</h3>
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
