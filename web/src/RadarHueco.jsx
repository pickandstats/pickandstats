import { Polygon } from 'recharts';

// Forma de Radar (prop `shape`) que deja un HUECO donde la serie no tiene valor.
//
// Recharts calcula el radio de un punto sin valor como 0: el vertice cae en el
// CENTRO y el poligono se une a traves de el, que se lee como "percentil 0". Un
// punto mal marcado es peor que uno ausente, asi que aqui los puntos sin valor
// (`value == null`) se pasan a Polygon con coordenadas no validas: Polygon parte
// el trazo en segmentos abiertos en vez de unir los dos vecinos.
//
// Consecuencia, a proposito: una serie con hueco se dibuja SIN relleno (un
// trazo abierto no se rellena); sin hueco es el poligono cerrado de siempre.
export const formaConHueco = props => {
  const puntos = (props.points || []).map(p => (p.value == null ? { ...p, x: NaN, y: NaN } : p));
  return <Polygon {...props} points={puntos} connectNulls={false} />;
};
