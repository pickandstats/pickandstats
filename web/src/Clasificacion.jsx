import { useEffect, useMemo, useState } from 'react';
import FasesAscenso from './FasesAscenso';
import PlayOff from './PlayOff';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);

export default function Clasificacion({
  partidos, equipos, grupos, temporada, competicion,
  onVerEquipo, onVerPartido
}) {
  const [seccion, setSeccion] = useState('liga');
  const [grupo, setGrupo] = useState(null);
  const [fases, setFases] = useState(null);

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);

  useEffect(() => {
    setFases(null);
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/${temporada}/fases.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setFases)
      .catch(() => setFases([]));
  }, [competicion, temporada]);

  const porJornada = useMemo(() => {
    const m = new Map();
    partidos.filter(p => p.grupo === grupo).forEach(p => {
      const n = numJornada(p.jornada);
      if (!m.has(n)) m.set(n, { etiqueta: p.jornada, lista: [] });
      m.get(n).lista.push(p);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [partidos, grupo]);

  const jornadasDisponibles = porJornada.map(([n]) => n);
  const ultimaJornada = jornadasDisponibles[jornadasDisponibles.length - 1] || 1;
  const [jornadaSel, setJornadaSel] = useState(null);
  const jornadaActiva = jornadaSel ?? ultimaJornada;

  const clasificacion = useMemo(() => {
    const jugados = partidos
      .filter(p => p.grupo === grupo && numJornada(p.jornada) <= jornadaActiva)
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

    // Equipos con un 2-0 en contra. El formato del resultado es literalmente "0-2"
    // o "2-0" (ver data/processed/<comp>/<temp>/excluidos.json).
    const conDosCero = new Set();
    for (const { p, gl, gv } of jugados) {
      if (gl === 0 && gv === 2) conDosCero.add(p.local.id);
      if (gl === 2 && gv === 0) conDosCero.add(p.visitante.id);
    }

    const cociente = (pf, pc) => (pc > 0 ? pf / pc : Infinity);

    const totalJornadas = partidos
      .filter(p => p.grupo === grupo)
      .reduce((m, p) => Math.max(m, numJornada(p.jornada)), 1);
    const enPrimeraVuelta = jornadaActiva <= Math.ceil(totalJornadas / 2);

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

      const mini = calcularParticular(grupoEmpatado.map(e => e.id));
      const criterios = criteriosDe(mini);
      const comparar = (a, b) => {
        for (const c of criterios) { const r = c(a, b); if (r) return r; }
        return 0;
      };
      const ordenados = [...grupoEmpatado].sort(comparar);

      // "Si aplicando los criterios anteriores se reduce el numero de equipos
      // empatados se iniciara el procedimiento entre los que sigan empatados tantas
      // veces como sea necesario": se recalcula el particular solo entre ellos.
      const resultado = [];
      let i = 0;
      while (i < ordenados.length) {
        let j = i + 1;
        while (j < ordenados.length && comparar(ordenados[i], ordenados[j]) === 0) j++;
        const bloque = ordenados.slice(i, j);
        resultado.push(...(bloque.length > 1 && bloque.length < grupoEmpatado.length
          ? ordenarEmpatados(bloque)
          : bloque));
        i = j;
      }
      return resultado;
    };

    const porVictorias = [...equiposArr].sort((a, b) => b.pg - a.pg);
    const final = [];
    let i = 0;
    while (i < porVictorias.length) {
      let j = i + 1;
      while (j < porVictorias.length && porVictorias[j].pg === porVictorias[i].pg) j++;
      const empatados = porVictorias.slice(i, j);
      final.push(...(empatados.length > 1 ? ordenarEmpatados(empatados) : empatados));
      i = j;
    }
    return final;
  }, [partidos, grupo, jornadaActiva]);

  const buscarEquipo = id => equipos.find(e => e.id === id);
  const clicEquipo = id => { const e = buscarEquipo(id); if (e) onVerEquipo(e); };
  const clicEquipoNombre = nombre => {
    const e = equipos.find(x => x.nombre === nombre);
    if (e) onVerEquipo(e);
  };

  const hayFases = Array.isArray(fases) && fases.length > 0;

  if (!partidos.length) {
    return (
      <div>
        <h3 className="seccion">Clasificación</h3>
        <p className="aviso-dato">
          La clasificación aparecerá cuando se disputen las primeras jornadas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grupos">
        <button className={`boton-grupo ${seccion === 'liga' ? 'activo' : ''}`}
          onClick={() => setSeccion('liga')}>Liga regular</button>
        <button className={`boton-grupo ${seccion === 'fases' ? 'activo' : ''}`}
          onClick={() => setSeccion('fases')}
          disabled={!hayFases}
          title={hayFases ? '' : 'Sin fases descargadas para esta temporada'}>
          Fases de ascenso
        </button>
      </div>

      {seccion === 'liga' ? (
        <>
          <div className="grupos">
            {grupos.map(g => (
              <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
                onClick={() => { setGrupo(g); setJornadaSel(null); }}>{g}</button>
            ))}
          </div>

          <div className="filtros">
            <label>
              Jornada{' '}
              <select value={jornadaActiva} onChange={e => setJornadaSel(+e.target.value)}>
                {porJornada.map(([n]) => (
                  <option key={n} value={n}>Jornada {n}</option>
                ))}
              </select>
            </label>
          </div>

          <h3 className="seccion">Clasificación tras jornada {jornadaActiva}</h3>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>#</th><th className="izq">Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>Dif</th></tr>
              </thead>
              <tbody>
                {clasificacion.map((e, i) => (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td className="izq"><span className="enlace" onClick={() => clicEquipo(e.id)}>{e.nombre}</span></td>
                    <td>{e.pj}</td><td>{e.pg}</td><td>{e.pp}</td>
                    <td>{e.pf}</td><td>{e.pc}</td>
                    <td className={e.dif > 0 ? 'net-pos' : 'net-neg'}>{e.dif > 0 ? '+' : ''}{e.dif}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pie" style={{ marginTop: 4 }}>
            Desempates según el artículo 84 del Reglamento General y de Competiciones de la
            FEB. Hasta el final de la primera vuelta mandan la diferencia y el cociente
            generales; desde la segunda vuelta, el enfrentamiento directo entre los equipos
            igualados a victorias. Un equipo con un 2-0 en contra ocupa la última posición
            entre los empatados a victorias con él.
          </p>
        </>
      ) : (
        <>
          <h3 className="seccion">Fases de ascenso · {`${temporada}/${(+temporada + 1).toString().slice(2)}`}</h3>
          {fases === null ? (
            <p className="cargando">Cargando fases…</p>
          ) : (
            competicion === 'tercerafeb' ? (
              <FasesAscenso fases={fases} onVerEquipoNombre={clicEquipoNombre} onVerPartido={onVerPartido} />
            ) : (
              <PlayOff fases={fases} modo={competicion === 'segundafeb' ? 'global' : 'victorias'} onVerEquipoNombre={clicEquipoNombre} onVerPartido={onVerPartido} />
            )
          )}
          <p className="pie" style={{ marginTop: 8 }}>
            Los partidos de fases no computan en las estadísticas de temporada regular.
          </p>
        </>
      )}
    </>
  );
}
