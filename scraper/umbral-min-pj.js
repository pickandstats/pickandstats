// Umbral minimo de partidos jugados para entrar en listas y en la base de
// percentiles (_instrucciones.md 21/10, punto 1; decision de Alexandre: se
// aplica a ambos). El 12 fijo exigia, en la jornada en que la lista aparece
// por primera vez, asistencia practicamente perfecta -- en Primera 2025,
// 34 de 224 jugadores calificaban y el lider del ranking acababa 9º en la
// tabla final. El umbral tiene que moverse con la temporada:
//
//   minPj = max(3, ceil(0.6 x jornadas jugadas))
//
// "Jornadas jugadas" es la MEDIANA de partidos jugados por los equipos, no
// el maximo: el maximo se adelanta en cuanto un calendario se desequilibra
// (el primer caso real, 18 de noviembre, Uros de Rivas - Real Canoe), y la
// mediana es la que de verdad describe cuanto ha avanzado la temporada para
// la mayoria de equipos.
//
// El suelo de 3 evita dos roturas: con suelo 5 o 6 no hay lista ninguna en
// la jornada 4 (ceil(0.6*4)=3 ya es menor que esos suelos, q=0, nadie
// califica). El suelo NO evita el "lider efimero" (around 1 de cada 10
// temporadas tiene uno al principio, con cualquier suelo razonable) -- eso
// es inherente a medir pronto, no algo que el suelo pueda arreglar.
function minPjDe(jornadasJugadas) {
  return Math.max(3, Math.ceil(0.6 * jornadasJugadas));
}

function mediana(valores) {
  const s = [...valores].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

module.exports = { minPjDe, mediana };
