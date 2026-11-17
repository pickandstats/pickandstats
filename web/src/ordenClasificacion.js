// Orden de la clasificacion de liga regular. Funcion pura, sin React, para que
// la pruebe test/verificar-clasificacion.mjs con datos fijos (lote 36).

export const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);

// Jornadas de la liga regular COMPLETA del grupo, para saber donde acaba la
// primera vuelta. No vale la ultima jornada de partidos.json: solo trae las
// jugadas, y con eso la "mitad" siempre quedaba por detras de la jornada vista
// y se aplicaba el regimen de segunda vuelta desde la J2 (lote 36).
// Con calendario (temporada en curso) manda el calendario; sin el, se deduce
// del numero de equipos: doble vuelta, N-1 jornadas por vuelta si N es par y N
// si es impar (cada jornada descansa uno).
export function totalJornadasGrupo(partidosGrupo, calendarioGrupo = null) {
  if (calendarioGrupo?.length) {
    return calendarioGrupo.reduce((m, p) => Math.max(m, numJornada(p.jornada)), 1);
  }
  const ids = new Set();
  for (const p of partidosGrupo) { ids.add(p.local.id); ids.add(p.visitante.id); }
  const n = ids.size;
  return n % 2 === 0 ? 2 * (n - 1) : 2 * n;
}

// Desempates segun el articulo 84 del Reglamento General y de Competiciones de
// la FEB (edicion mayo 2026). Son DOS regimenes distintos, y la diferencia no es
// menor: en la primera vuelta manda lo general y el enfrentamiento directo es el
// tercer criterio; en la segunda es justo al reves.
//
//   84.1, hasta el final de la primera vuelta:
//     a) mayor diferencia general de tantos
//     b) mayor cociente general de tantos
//     c) victorias-derrotas solo entre los empatados
//     d) mayor diferencia de tantos entre los que sigan empatados
//     e) mayor cociente de tantos entre los que sigan empatados
//
//   84.2, desde el inicio de la segunda vuelta y hasta el final:
//     1o victorias-derrotas entre ellos
//     2o mayor diferencia de tantos entre ellos
//     3o mayor numero de tantos a favor entre ellos
//     4o mayor diferencia general de tantos
//     5o mayor numero de tantos a favor generales
//
//   84.2.c: un equipo con un tanteo de 2-0 en contra (incomparecencia o sancion)
//   ocupa la ULTIMA posicion entre los empatados a victorias con el, pase lo que
//   pase con el resto de criterios.
//
// partidos: los del grupo (cualquier jornada; se filtran por `jornada`).
// totalJornadas: las de la liga regular COMPLETA del grupo, no las jugadas.
export function ordenarClasificacion(partidos, { jornada, totalJornadas }) {
  const jugados = partidos
    .filter(p => numJornada(p.jornada) <= jornada)
    .map(p => {
      const [gl, gv] = (p.resultado || '').split('-').map(Number);
      return { p, gl, gv };
    })
    .filter(({ gl, gv }) => !isNaN(gl) && !isNaN(gv));

  const tab = {};
  const nombreEq = {};
  for (const { p, gl, gv } of jugados) {
    for (const lado of ['local', 'visitante']) {
      const eq = p[lado];
      if (!tab[eq.id]) tab[eq.id] = { id: eq.id, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0 };
      nombreEq[eq.id] = eq.nombre;
    }
    const L = tab[p.local.id], V = tab[p.visitante.id];
    L.pj++; V.pj++;
    L.pf += gl; L.pc += gv; V.pf += gv; V.pc += gl;
    if (gl > gv) { L.pg++; V.pp++; } else { V.pg++; L.pp++; }
  }

  const equiposArr = Object.values(tab).map(e => ({ ...e, nombre: nombreEq[e.id], dif: e.pf - e.pc }));

  // Equipos con un 2-0 en contra. El formato del resultado es literalmente "0-2"
  // o "2-0" (ver data/processed/<comp>/<temp>/excluidos.json).
  const conDosCero = new Set();
  for (const { p, gl, gv } of jugados) {
    if (gl === 0 && gv === 2) conDosCero.add(p.local.id);
    if (gl === 2 && gv === 0) conDosCero.add(p.visitante.id);
  }

  const cociente = (pf, pc) => (pc > 0 ? pf / pc : Infinity);

  const enPrimeraVuelta = jornada <= Math.ceil(totalJornadas / 2);

  const calcularParticular = (ids) => {
    const set = new Set(ids);
    const mini = {};
    ids.forEach(id => { mini[id] = { id, pg: 0, dif: 0, pf: 0, pc: 0 }; });
    for (const { p, gl, gv } of jugados) {
      if (set.has(p.local.id) && set.has(p.visitante.id)) {
        const L = mini[p.local.id], V = mini[p.visitante.id];
        L.pf += gl; L.pc += gv; V.pf += gv; V.pc += gl;
        L.dif += (gl - gv); V.dif += (gv - gl);
        if (gl > gv) L.pg++; else V.pg++;
      }
    }
    return mini;
  };

  const criteriosDe = (mini) => (enPrimeraVuelta
    ? [
        (a, b) => b.dif - a.dif,
        (a, b) => cociente(b.pf, b.pc) - cociente(a.pf, a.pc),
        (a, b) => mini[b.id].pg - mini[a.id].pg,
        (a, b) => mini[b.id].dif - mini[a.id].dif,
        (a, b) => cociente(mini[b.id].pf, mini[b.id].pc) - cociente(mini[a.id].pf, mini[a.id].pc),
      ]
    : [
        (a, b) => mini[b.id].pg - mini[a.id].pg,
        (a, b) => mini[b.id].dif - mini[a.id].dif,
        (a, b) => mini[b.id].pf - mini[a.id].pf,
        (a, b) => b.dif - a.dif,
        (a, b) => b.pf - a.pf,
      ]);

  const ordenarEmpatados = (grupoEmpatado) => {
    if (grupoEmpatado.length === 1) return grupoEmpatado;

    // 84.2.c antes que nada: los que arrastran un 2-0 van al final del bloque.
    const limpios = grupoEmpatado.filter(e => !conDosCero.has(e.id));
    const penalizados = grupoEmpatado.filter(e => conDosCero.has(e.id));
    if (penalizados.length && limpios.length) {
      return [...ordenarEmpatados(limpios), ...ordenarEmpatados(penalizados)];
    }

    // "Si aplicando los criterios anteriores se reduce el numero de equipos
    // empatados se iniciara el procedimiento entre los que sigan empatados tantas
    // veces como sea necesario": en cuanto UN criterio parte el grupo, cada
    // trozo que siga empatado vuelve a empezar desde el primero, con el
    // particular recalculado solo entre ellos. No se siguen aplicando los
    // criterios del grupo grande: en Tercera C-A 2025/26 un empate a cuatro a
    // 11-15 dejaba a dos a 4-2 en la miniliga; la FEB los separa por su
    // enfrentamiento directo (1-1, +6 frente a -6) y nosotros por la diferencia
    // de la miniliga de cuatro (+19 frente a +18), al reves (lote 36).
    const mini = calcularParticular(grupoEmpatado.map(e => e.id));
    for (const criterio of criteriosDe(mini)) {
      const ordenados = [...grupoEmpatado].sort(criterio);
      const bloques = [];
      for (const e of ordenados) {
        const ultimo = bloques[bloques.length - 1];
        if (ultimo && criterio(ultimo[0], e) === 0) ultimo.push(e);
        else bloques.push([e]);
      }
      if (bloques.length > 1) return bloques.flatMap(b => ordenarEmpatados(b));
    }
    return grupoEmpatado;
  };

  // Articulo 79, criterios SUCESIVOS: a) victorias; b) porcentaje de victorias
  // si no todos han jugado los mismos partidos (aplazados, grupos impares con
  // descanso). No es "porcentaje en vez de victorias": la tabla oficial de
  // Tercera B-B tras la J7 deja un 3-2 (60 %) por debajo de los 4-3 (57 %), y un
  // 5-1 por encima de un 5-2. Con las mismas victorias, mas porcentaje es menos
  // partidos jugados. Productos cruzados para que el empate sea exacto y pase
  // al articulo 84.
  const compararBalance = (a, b) => (b.pg - a.pg) || (b.pg * a.pj - a.pg * b.pj);

  const porVictorias = [...equiposArr].sort(compararBalance);
  const final = [];
  let i = 0;
  while (i < porVictorias.length) {
    let j = i + 1;
    while (j < porVictorias.length && compararBalance(porVictorias[i], porVictorias[j]) === 0) j++;
    const empatados = porVictorias.slice(i, j);
    final.push(...(empatados.length > 1 ? ordenarEmpatados(empatados) : empatados));
    i = j;
  }
  return final;
}
