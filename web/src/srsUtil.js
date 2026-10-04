// El SRS recentra el net de cada equipo sobre el calendario que ha jugado
// hasta ahora. Con pocos partidos el ajuste es ruido, no señal: medido sobre
// dos temporadas completas de Primera (2024/25 y 2025/26), el |SRS-net| se
// dispara en la jornada 2 (media de 16 puntos, el peor momento de toda la
// temporada) y no se asienta en un rango estable hasta la jornada 15, donde
// el % de equipos con más de 3 puntos de diferencia cae a 0% y se queda ahí
// el resto de temporada. Ver _informe-umbral-srs.md para la curva completa.
//
// Mismo umbral para las tres competiciones por ahora: Segunda y Tercera
// arrancan con el mismo problema (SRS idéntico a net en la jornada 1), y la
// medición propia de cada una queda pendiente (Tercera cruza en la jornada
// 13 de 26, Primera en la 15 de 34 -- apunta a que lo que importa es la
// fracción de calendario del grupo jugada, no un número de jornada fijo,
// pero dos puntos no son una regla todavía).
export const UMBRAL_SRS_JORNADA = 15;

// Proxy de "jornada actual": el máximo de partidos jugados entre los equipos
// dados. En liga regular todos juegan ~1 partido por jornada, así que el
// máximo (no la media) es robusto a que algún equipo tenga un partido
// aplazado por detrás del resto.
export const jornadaActual = equipos =>
  equipos.length ? Math.max(...equipos.map(e => e.pj || 0)) : 0;

export const srsListo = equipos => jornadaActual(equipos) >= UMBRAL_SRS_JORNADA;

export const notaSrs = equipos => {
  const j = jornadaActual(equipos);
  return `El SRS aparece a partir de la jornada ${UMBRAL_SRS_JORNADA}, cuando el ajuste ` +
    `por calendario deja de ser ruido de muestra` + (j ? ` (vamos por la ${j}).` : '.');
};
