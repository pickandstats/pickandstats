import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from 'recharts';
import AnalisisEquipo from './AnalisisEquipo';
import DossierPartido from './DossierPartido';

const numJornada = j => parseInt((j.match(/\d+/) || [0])[0], 10);

const COLOR = { tinta: '#16233a', acento: '#e8622c', suave: '#9aa1ac' };

// El modo elegido se mantiene al abrir otras fichas durante la sesión:
// un entrenador que revisa varios equipos no quiere pulsar 'Análisis' cada vez.
let modoRecordado = 'resumen';

export default function Equipo({ equipo, jugadores, partidos, onVolver, onVerEquipo, onVerJugador, onVerPartido, equipos, datosClub, equiposCuartos, rivalInicial }) {
  const club = (datosClub || {})[equipo.idClub] || null;
  const cuartos = (equiposCuartos || []).find(x => x.equipoId === equipo.idClub) || null;
  const hayCuartos = cuartos && cuartos.porCuarto && cuartos.porCuarto.some(q => q.pj > 0);
  const hayContexto = hayCuartos && cuartos.porCuarto.some(q => q.ctxFavor);
  const [vistaFicha, _setVistaFicha] = useState(rivalInicial ? 'dossier' : modoRecordado);
  const [cuartosSel, setCuartosSel] = useState([0, 1, 2, 3]); // cuartos activos en el selector de contexto
  const CAMPOS_CTX = [
    ['contraataque', 'Contraataque'], ['pintura', 'Pintura'],
    ['segundaOportunidad', '2ª oportunidad'], ['trasPerdida', 'Tras pérdida'], ['banquillo', 'Banquillo'],
  ];
  const ctxSumado = useMemo(() => {
    const acc = { favor: {}, contra: {} };
    CAMPOS_CTX.forEach(([c]) => { acc.favor[c] = 0; acc.contra[c] = 0; });
    if (hayCuartos) cuartosSel.forEach(i => {
      const q = cuartos.porCuarto[i];
      if (!q) return;
      CAMPOS_CTX.forEach(([c]) => {
        acc.favor[c] += (q.ctxFavor && q.ctxFavor[c]) || 0;
        acc.contra[c] += (q.ctxContra && q.ctxContra[c]) || 0;
      });
    });
    CAMPOS_CTX.forEach(([c]) => {
      acc.favor[c] = Math.round(acc.favor[c] * 10) / 10;
      acc.contra[c] = Math.round(acc.contra[c] * 10) / 10;
    });
    return acc;
  }, [cuartos, cuartosSel, hayCuartos]);
  const setVistaFicha = m => { modoRecordado = m; _setVistaFicha(m); };

  const plantilla = useMemo(() =>
    jugadores.filter(j => j.equipoId === equipo.id)
      .sort((a, b) => b.vaPorPartido - a.vaPorPartido),
    [jugadores, equipo]);

  const calendario = useMemo(() =>
    partidos.filter(p => p.local.id === equipo.id || p.visitante.id === equipo.id)
      .sort((a, b) => numJornada(a.jornada) - numJornada(b.jornada)),
    [partidos, equipo]);

  const evolucion = useMemo(() => calendario.map(p => {
    const [gl, gv] = p.resultado.split('-').map(Number);
    const esLocal = p.local.id === equipo.id;
    return {
      jornada: numJornada(p.jornada),
      anotados: esLocal ? gl : gv,
      encajados: esLocal ? gv : gl,
      rival: (esLocal ? p.visitante : p.local).nombre
    };
  }).filter(d => d.anotados > 5 || d.encajados > 5),
  [calendario, equipo]);

  // Con un solo grupo, el SRS converge al Net multiplicado por (n-1)/n:
  // es el mismo dato encogido, así que no se muestra.
  const unGrupo = new Set(equipos.map(x => x.grupo)).size <= 1;

  const fourFactors = useMemo(() => {
    const delGrupo = equipos.filter(e => e.grupo === equipo.grupo);
    const media = clave => delGrupo.reduce((a, e) => a + e[clave], 0) / delGrupo.length;
    return [
      { factor: 'eFG%', equipo: equipo.efg,    grupo: +media('efg').toFixed(2) },
      { factor: 'TOV%', equipo: equipo.tovPct, grupo: +media('tovPct').toFixed(2) },
      { factor: 'ORB%', equipo: equipo.orbPct, grupo: +media('orbPct').toFixed(2) },
      { factor: 'FTr',  equipo: equipo.ftRate, grupo: +media('ftRate').toFixed(2) },
    ];
  }, [equipos, equipo]);

  const resultadoPartido = p => {
    const [gl, gv] = p.resultado.split('-').map(Number);
    const esLocal = p.local.id === equipo.id;
    const gano = esLocal ? gl > gv : gv > gl;
    return { gano, marcador: p.resultado, esLocal, rival: esLocal ? p.visitante : p.local };
  };

  const buscarEquipo = id => equipos.find(e => e.id === id);

  // Contexto: cada cifra se compara con la media de su grupo.
  const delGrupo = equipos.filter(e => e.grupo === equipo.grupo);
  const mediaDe = clave => {
    const v = delGrupo.map(e => +e[clave]).filter(x => Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  // Métricas en las que menos es mejor
  const MENOS_MEJOR = new Set(['pcPartido', 'bpPartido', 'fcPartido', 'tapContra',
                               'tovPct', 'drtg', 'efgRival', 'ftrRival']);
  // Métricas de estilo, no de calidad: no se colorean
  const NEUTRAS = new Set(['pace', 't3ar', 'forma5', 'suerte']);
  const CON_SIGNO = new Set(['difPartido', 'netrtg', 'suerte']);

  const fmt = v => (typeof v === 'string' || !Number.isFinite(+v)) ? v : (+v).toFixed(1);

  // Puesto dentro del grupo: da más contexto que el valor suelto.
  const puestoDe = clave => {
    const vals = delGrupo
      .map(e => ({ id: e.id, v: +e[clave] }))
      .filter(x => Number.isFinite(x.v));
    if (vals.length < 3) return null;
    vals.sort((a, b) => MENOS_MEJOR.has(clave) ? a.v - b.v : b.v - a.v);
    const i = vals.findIndex(x => x.id === equipo.id);
    return i < 0 ? null : { puesto: i + 1, total: vals.length };
  };

  const dato = (etiqueta, clave) => {
    const v = equipo[clave];
    const p = NEUTRAS.has(clave) ? null : puestoDe(clave);
    let clase = '';
    if (p) {
      const tercio = p.total / 3;
      if (p.puesto <= tercio) clase = 'val-bien';
      else if (p.puesto > p.total - tercio) clase = 'val-mal';
    }
    const signo = CON_SIGNO.has(clave) && +v > 0 ? '+' : '';
    return (
      <div className="dato" key={etiqueta}>
        <div className="dato-etiqueta">{etiqueta}</div>
        <div className={`dato-valor ${clase}`}>{signo}{fmt(v)}</div>
        <div className="dato-puesto">{p ? `${p.puesto}º de ${p.total}` : ''}</div>
      </div>
    );
  };

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="ficha-cabecera">
        <div>
          <h2 className="ficha-nombre">{equipo.nombre}</h2>
          <p className="lema">Grupo {equipo.grupo} · {equipo.pg}-{equipo.pp} ·
            {' '}Casa {equipo.casa.pg}-{equipo.casa.pj - equipo.casa.pg} ·
            {' '}Fuera {equipo.fuera.pg}-{equipo.fuera.pj - equipo.fuera.pg}</p>
        </div>
        <div className="datos-bloque">
        </div>
      </div>

      <div className="grupos" style={{ marginTop: 4 }}>
        <button className={`boton-grupo ${vistaFicha === 'resumen' ? 'activo' : ''}`}
          onClick={() => setVistaFicha('resumen')}>Resumen</button>
        <button className={`boton-grupo ${vistaFicha === 'analisis' ? 'activo' : ''}`}
          onClick={() => setVistaFicha('analisis')}>Análisis</button>
        <button className={`boton-grupo ${vistaFicha === 'dossier' ? 'activo' : ''}`}
          onClick={() => setVistaFicha('dossier')}>Preparar partido</button>
        <button className={`boton-grupo ${vistaFicha === 'informacion' ? 'activo' : ''}`}
          onClick={() => setVistaFicha('informacion')}>Información</button>
        {hayCuartos && (
          <button className={`boton-grupo ${vistaFicha === 'cuartos' ? 'activo' : ''}`}
            onClick={() => setVistaFicha('cuartos')}>Por cuartos</button>
        )}
      </div>

      {vistaFicha === 'cuartos' && hayCuartos ? (
        <div className="cuartos-equipo">
          <h3 className="seccion">Eficiencia por cuarto · temporada actual</h3>
          <div style={{ width: '100%', height: 260, marginTop: 8 }}>
            <ResponsiveContainer>
              <LineChart data={cuartos.porCuarto.map((q, i) => ({
                cuarto: `Q${i + 1}`, Ataque: q.ortg, Defensa: q.drtg,
              }))} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ee" />
                <XAxis dataKey="cuarto" tick={{ fontSize: 13, fill: COLOR.tinta }} />
                <YAxis tick={{ fontSize: 12, fill: COLOR.tinta }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="Ataque" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Defensa" stroke="#7d93b2" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="pie">
            Puntos anotados (ataque) y recibidos (defensa) por cada 100 posesiones, en cada cuarto.
            Cuando la línea de ataque supera a la de defensa, el equipo gana ese cuarto. Revela en qué
            tramos del partido es fuerte o flojo.
          </p>
          <h3 className="seccion" style={{ marginTop: 18 }}>Ritmo por cuarto</h3>
          <div className="datos-bloque">
            <div className="datos">
              {cuartos.porCuarto.map((q, i) => (
                <div className="dato" key={i}>
                  <div className="dato-etiqueta">{`Q${i + 1}`}</div>
                  <div className="dato-valor">{q.pace}</div>
                </div>
              ))}
              <div className="dato" key="total">
                <div className="dato-etiqueta">Total</div>
                <div className="dato-valor" style={{ color: COLOR.acento }}>{equipo.pace}</div>
              </div>
            </div>
            <p className="pie" style={{ marginTop: 8 }}>
              Posesiones por cuarto. Indica si el equipo acelera o frena el juego según el tramo del partido.
            </p>
          </div>

          {hayContexto && (<>
          <h3 className="seccion" style={{ marginTop: 18 }}>Contexto por cuarto</h3>
          <div className="grupos" style={{ marginTop: 4 }}>
            {[0, 1, 2, 3].map(i => {
              const activo = cuartosSel.includes(i);
              return (
                <button key={i} className={`boton-grupo ${activo ? 'activo' : ''}`}
                  onClick={() => setCuartosSel(activo
                    ? (cuartosSel.length > 1 ? cuartosSel.filter(x => x !== i) : cuartosSel)
                    : [...cuartosSel, i].sort())}>
                  {`Q${i + 1}`}
                </button>
              );
            })}
            <button className={`boton-grupo ${cuartosSel.length === 4 ? 'activo' : ''}`}
              onClick={() => setCuartosSel([0, 1, 2, 3])}>Todos</button>
          </div>
          <div className="tabla-scroll tabla-una-fija" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th className="izq">Puntos de…</th>
                  <th>A favor</th>
                  <th>En contra</th>
                </tr>
              </thead>
              <tbody>
                {CAMPOS_CTX.map(([clave, etiqueta]) => (
                  <tr key={clave}>
                    <td className="izq">{etiqueta}</td>
                    <td>{ctxSumado.favor[clave]}</td>
                    <td>{ctxSumado.contra[clave]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pie" style={{ marginTop: 4 }}>
            Medias por partido en los cuartos seleccionados. «A favor» es lo que genera el equipo; «en contra», lo que concede al rival.
            Contraataque, puntos en la pintura, de segunda oportunidad, tras pérdida del rival y desde el banquillo.
          </p>
          </>)}
        </div>
      ) : vistaFicha === 'informacion' ? (
        <div className="club-ficha">
          {!club ? (
            <p className="aviso-dato">No hay datos de club disponibles para este equipo.</p>
          ) : (
            <>
              {club.pabellon && (
                <div className="club-dato">
                  <span className="club-etiqueta">Dónde juega</span>
                  <span className="club-valor">{club.pabellon}</span>
                  {club.direccionPabellon && (
                    <span className="club-direccion">{club.direccionPabellon}</span>
                  )}
                </div>
              )}
              {club.horarioLocal && (
                <div className="club-dato">
                  <span className="club-etiqueta">Cuándo juega en casa</span>
                  <span className="club-valor">{club.horarioLocal}</span>
                </div>
              )}
              {club.web && (
                <div className="club-dato">
                  <span className="club-etiqueta">Web oficial</span>
                  <a className="club-web" href={club.web} target="_blank" rel="noopener noreferrer">
                    {club.web.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      ) : vistaFicha === 'analisis' ? (
        <>
        {/* Análisis movido */}
        <div className="datos-bloque" style={{ marginTop: 12 }}>
          <div className="datos-titulo">Básica · Anotación y tiro</div>
          <div className="datos">
            {dato('PF/part.', 'pfPartido')}
            {dato('PC/part.', 'pcPartido')}
            {dato('Dif.', 'difPartido')}
            {dato('T2%', 't2PctEq')}
            {dato('T3%', 't3PctEq')}
            {dato('TL%', 'tlPctEq')}
          </div>
          <div className="datos-titulo">Básica · Juego</div>
          <div className="datos">
            {dato('RO', 'roPartido')}
            {dato('RD', 'rdPartido')}
            {dato('REB', 'rebPartido')}
            {dato('AST', 'asPartido')}
            {dato('ROB', 'brPartido')}
            {dato('BP', 'bpPartido')}
            {dato('FC', 'fcPartido')}
            {dato('FR', 'frPartido')}
            {dato('TAP', 'tapFavor')}
            {dato('TR', 'tapContra')}
          </div>
          <div className="datos-titulo">Global</div>
          <div className="datos">
            {dato('Net', 'netrtg')}
            {!unGrupo && dato('SRS', 'srs')}
            {dato('Pace', 'pace')}
            {dato('Últ. 5', 'forma5')}
            {dato('Suerte', 'suerte')}
          </div>
          <div className="datos-titulo">Ataque</div>
          <div className="datos">
            {dato('ORtg', 'ortg')}
            {dato('eFG%', 'efg')}
            {dato('TS%', 'ts')}
            {dato('TOV%', 'tovPct')}
            {dato('ORB%', 'orbPct')}
            {dato('FTr', 'ftRate')}
            {dato('3PAr', 't3ar')}
            {dato('AST%', 'astPct')}
          </div>
          <div className="datos-titulo">Defensa</div>
          <div className="datos">
            {dato('DRtg', 'drtg')}
            {dato('eFG% rival', 'efgRival')}
            {dato('TOV forz.', 'tovForzadas')}
            {dato('DRB%', 'drbPct')}
            {dato('FTr rival', 'ftrRival')}
          </div>
        </div>
          <h3 className="seccion">Análisis del equipo</h3>
          <AnalisisEquipo equipo={equipo} equipos={equipos} cuartos={cuartos} />

          <h3 className="seccion">Four Factors vs media del grupo</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fourFactors} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
                <XAxis dataKey="factor" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, nombre) => [v, nombre === 'equipo' ? equipo.nombre : `Media grupo ${equipo.grupo}`]} />
                <Legend formatter={v => v === 'equipo' ? equipo.nombre : `Media grupo ${equipo.grupo}`} />
                <Bar dataKey="equipo" fill={COLOR.acento} radius={[3, 3, 0, 0]} />
                <Bar dataKey="grupo" fill={COLOR.suave} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="pie" style={{ marginTop: 4 }}>
              En TOV% (pérdidas), menos es mejor; en el resto, más es mejor.
            </p>
          </div>

        </>
      ) : vistaFicha === 'dossier' ? (
        <DossierPartido equipo={equipo} equipos={equipos} rivalInicial={rivalInicial}
          jugadores={jugadores} onVerJugador={onVerJugador} />
      ) : (
        <>
          <h3 className="seccion">Evolución por jornada</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
                <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  formatter={(v, nombre) => [v, nombre === 'anotados' ? 'Anotados' : 'Encajados']}
                  labelFormatter={(j, datos) => {
                    const d = datos && datos[0] && datos[0].payload;
                    return `Jornada ${j}${d ? ' · vs ' + d.rival : ''}`;
                  }}
                />
                <Legend formatter={v => v === 'anotados' ? 'Anotados' : 'Encajados'} />
                <Line type="monotone" dataKey="anotados" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="encajados" stroke={COLOR.tinta} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="seccion">Plantilla</h3>
          <div className="tabla-scroll tabla-una-fija">
            <table>
              <thead>
                <tr>
                  <th className="izq">Jugador</th><th>PJ</th><th>MIN</th><th>PTS</th>
                  <th>REB</th><th>AST</th><th>ROB</th><th>BP</th><th>TAP</th>
                  <th>T2%</th><th>T3%</th><th>TL%</th>
                  <th>VAL</th><th>TS%</th><th>USG%</th>
                </tr>
              </thead>
              <tbody>
                {plantilla.map(j => (
                  <tr key={j.nombre}>
                    <td className="izq">
                      <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                    </td>
                    <td>{j.pj}</td><td>{j.minPorPartido}</td><td>{j.ptPorPartido}</td>
                    <td>{j.rtPorPartido}</td><td>{j.asPorPartido}</td>
                    <td>{j.brPorPartido}</td><td>{j.bpPorPartido}</td><td>{j.tpPorPartido}</td>
                    <td>{j.t2Pct}</td><td>{j.t3Pct}</td><td>{j.tlPct}</td>
                    <td>{j.vaPorPartido}</td><td>{j.ts}</td><td>{j.usg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="seccion">Resultados</h3>
          <div className="tabla-scroll tabla-una-fija">
            <table>
              <thead>
                <tr>
                  <th>Jor.</th><th className="izq">Rival</th><th className="izq">Sede</th>
                  <th className="izq">Resultado</th><th>Marcador</th>
                </tr>
              </thead>
              <tbody>
                {calendario.map(p => {
                  const r = resultadoPartido(p);
                  const rivalObj = buscarEquipo(r.rival.id);
                  return (
                    <tr key={p.id}>
                      <td>{numJornada(p.jornada)}</td>
                      <td className="izq">
                        {rivalObj
                          ? <span className="enlace" onClick={() => onVerEquipo(rivalObj)}>{r.rival.nombre}</span>
                          : r.rival.nombre}
                      </td>
                      <td className="izq">{r.esLocal ? 'Casa' : 'Fuera'}</td>
                      <td className={`izq ${r.gano ? 'net-pos' : 'net-neg'}`}>{r.gano ? 'V' : 'D'}</td>
                      <td><span className="enlace" onClick={() => onVerPartido(p.id)}>{r.marcador}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
