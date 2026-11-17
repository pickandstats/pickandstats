import { useEffect, useMemo, useState } from 'react';
import FasesAscenso from './FasesAscenso';
import PlayOff from './PlayOff';
import { n0, s0 } from './formato';
import { numJornada, ordenarClasificacion, totalJornadasGrupo } from './ordenClasificacion';

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
    const delGrupo = partidos.filter(p => p.grupo === grupo);
    return ordenarClasificacion(delGrupo, {
      jornada: jornadaActiva,
      totalJornadas: totalJornadasGrupo(delGrupo),
    });
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
                    <td>{n0(e.pj)}</td><td>{n0(e.pg)}</td><td>{n0(e.pp)}</td>
                    <td>{n0(e.pf)}</td><td>{n0(e.pc)}</td>
                    <td className={e.dif > 0 ? 'net-pos' : 'net-neg'}>{s0(e.dif)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pie" style={{ marginTop: 4 }}>
            Desempates según el <a href="/guias/average-particular-desempates-feb/">artículo 84</a> del
            Reglamento General y de Competiciones de la
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
