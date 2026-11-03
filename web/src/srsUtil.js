// El SRS recentra el net de cada equipo sobre el calendario que ha jugado hasta
// ahora (ver el comentario en scraper/calcular.js). Con pocos partidos el ajuste
// es ruido, no señal -- pero el ruido se asienta a ritmos distintos segun el
// grupo, no segun una jornada fija: medido grupo a grupo, Tercera cruza entre
// la jornada 7 y la 22 segun el grupo (ver
// _informe-alcance-verificador-y-tercera.md). El criterio real nunca fue una
// jornada: es que ningun equipo del grupo tenga |srs - net| > 3.
//
// El SRS es un calculo del GRUPO ENTERO (punto fijo sobre los rivales del
// grupo a la vez): si un solo equipo tiene el ajuste desbocado, la solucion
// del grupo entero esta sin asentar, asi que el criterio se evalua con el
// maximo del grupo, nunca equipo a equipo.
import { n1 } from './formato';

export const UMBRAL_SRS_DIF = 3;

export const maxDifSrsGrupo = equiposDelGrupo =>
  equiposDelGrupo.length
    ? Math.max(...equiposDelGrupo.map(e => Math.abs((e.srs ?? 0) - (e.netrtg ?? 0))))
    : 0;

// Una vez que un grupo queda limpio no vuelve a ocultarse en la misma
// temporada aunque un resultado puntual lo desordene despues: medido sobre 26
// combinaciones grupo-temporada, 9 rebotan tras asentarse (ver
// _informe-rebotes-y-dominantes.md), y una columna intermitente es peor que
// una ausente. La app no puede calcular esto sola -- solo tiene el corte de
// hoy, no la serie por jornada -- asi que el pipeline persiste el flag por
// grupo en srs-pestillo.json (lo escribe calcular.js con un OR contra el
// valor anterior en cada ejecucion).
export const srsListo = (pestillo, grupo) => Boolean(pestillo && pestillo[grupo]);

export const notaSrs = (equiposDelGrupo, etiquetaGrupo) => {
  const d = maxDifSrsGrupo(equiposDelGrupo);
  const sujeto = etiquetaGrupo ? `del grupo ${etiquetaGrupo}` : 'de este grupo';
  return `El SRS ${sujeto} aparecerá cuando el ajuste por calendario deje de ser ` +
    `ruido de muestra; ahora el mayor del grupo es de ${n1(d)} puntos.`;
};

// La misma nota para VARIOS grupos a la vez (03/11, lote 31, punto 3.1): en la
// Tercera de arranque eran diez frases casi identicas seguidas, una por grupo
// -- un muro que nadie lee y que hace parecer roto algo que funciona. Una
// sola frase con el criterio y, en una linea, el desvio mayor de cada grupo.
// Con un solo grupo devuelve la frase de siempre.
export const notaSrsGrupos = (grupos) => {
  if (grupos.length === 1) return notaSrs(grupos[0].equipos, grupos[0].etiqueta);
  const lista = grupos.map(g => `${g.etiqueta} ${n1(maxDifSrsGrupo(g.equipos))}`).join(' · ');
  return `El SRS de estos grupos aparecerá cuando el ajuste por calendario deje de ser ruido de ` +
    `muestra, es decir, cuando en el grupo ningún equipo se desvíe más de ${UMBRAL_SRS_DIF} puntos de su ` +
    `Net. Desvío mayor ahora, por grupo: ${lista}.`;
};
