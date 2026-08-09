import { useEffect, useMemo, useState } from 'react';
import RadarJugador from './RadarJugador';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const numJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);
const etiquetaTemp = t => `${t}/${(+t + 1).toString().slice(2)}`;
const COLOR = { tinta: '#16233a', acento: '#e8622c' };

// color de la barra de percentil: rojo apagado (bajo) -> gris (medio) -> verde (alto)
const colorPercentil = p => {
  if (p == null) return '#c9ced8';
  if (p >= 80) return '#0a7d33';
  if (p >= 60) return '#5fa763';
  if (p >= 40) return '#c7a83e';
  if (p >= 20) return '#d98a3d';
  return '#c0392b';
};

const METRICAS_PCT = [
  { clave: 'ptPorPartido', titulo: 'Puntos' },
  { clave: 'rtPorPartido', titulo: 'Rebotes' },
  { clave: 'asPorPartido', titulo: 'Asistencias' },
  { clave: 'vaPorPartido', titulo: 'Valoración' },
  { clave: 'ts', titulo: 'TS%' },
];

// El modo elegido se mantiene al abrir otras fichas durante la sesión:
// quien revisa varios jugadores seguidos no quiere volver a pulsar cada vez.
let modoRecordado = 'resumen';

export default function Jugador({ carrera, historico, equipos, jugadores, onVolver, onVerEquipo,
                                 competicionNombre, competicion, temporada }) {
  const soloHistorico = carrera.soloHistorico === true;
  const multiEtapa = carrera.nEtapas > 1;
  const pct = carrera.percentiles || null;

  const [vista, _setVista] = useState(modoRecordado);
  const setVista = m => { modoRecordado = m; _setVista(m); };
  // Sin temporada actual no hay etapas ni evolución: nada que repartir en dos modos.
  const hayDetalle = !soloHistorico;
  const enResumen = !hayDetalle || vista === 'resumen';

  // Las fases se cargan aquí y no en App: solo hacen falta al abrir una ficha.
  const [fasesJugador, setFasesJugador] = useState(null);
  useEffect(() => {
    if (soloHistorico || !competicion || !temporada) { setFasesJugador(null); return; }
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/${temporada}/fases-jugadores.json`)
      .then(r => (r.ok ? r.json() : []))
      .then(lista => setFasesJugador(
        lista.find(x => String(x.idJugador) === String(carrera.idJugador)) || null))
      .catch(() => setFasesJugador(null));
  }, [competicion, temporada, carrera.idJugador, soloHistorico]);

  const evolucion = useMemo(() => {
    if (soloHistorico || !carrera.etapas) return [];
    return carrera.etapas
      .flatMap(e => e.evolucion.map(p => ({
        jornada: numJornada(p.jornada),
        pt: p.pt, va: p.va, min: Math.round(p.seg / 60), equipo: e.equipo
      })))
      .sort((a, b) => a.jornada - b.jornada);
  }, [carrera, soloHistorico]);

  const trayectoria = useMemo(() => {
    if (!historico || !historico.temporadas) return [];
    return Object.entries(historico.temporadas)
      .map(([temp, d]) => ({ temp, ...d }))
      .sort((a, b) => a.temp.localeCompare(b.temp));
  }, [historico]);

  // USG% y per-36 no vienen en el objeto de carrera, pero sí en las etapas.
  // Con varias etapas se ponderan por minutos jugados en cada una.
  const avanzadas = useMemo(() => {
    const et = (!soloHistorico && carrera.etapas) || [];
    if (!et.length) return null;
    const minDe = e => (e.minPorPartido || 0) * (e.pj || 0);
    const minTot = et.reduce((a, e) => a + minDe(e), 0);
    if (!minTot) return null;
    const pond = clave => et.reduce((a, e) => a + (+e[clave] || 0) * minDe(e), 0) / minTot;
    // 40 minutos, que es lo que dura un partido en Europa
    const por40 = clave =>
      et.reduce((a, e) => a + (+e[clave] || 0) * (e.pj || 0), 0) / minTot * 40;
    return {
      usg: pond('usg'),
      minTotales: minTot,
      per40: {
        pt: por40('ptPorPartido'), rt: por40('rtPorPartido'),
        as: por40('asPorPartido'), br: por40('brPorPartido'),
        va: por40('vaPorPartido'),
      },
    };
  }, [carrera, soloHistorico]);

  const fmt = (v, ent) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'string' || !Number.isFinite(+v)) return v;
    return ent ? String(Math.round(+v)) : (+v).toFixed(1);
  };

  const dato = (etiqueta, valor, ent) => (
    <div className="dato" key={etiqueta}>
      <div className="dato-etiqueta">{etiqueta}</div>
      <div className="dato-valor">{fmt(valor, ent)}</div>
    </div>
  );

  const enlaceEquipo = etapa => {
    const eq = equipos.find(x => x.id === etapa.equipoId);
    return eq
      ? <span className="enlace" onClick={() => onVerEquipo(eq)}>{etapa.equipo}</span>
      : etapa.equipo;
  };

  const barra = (p) => (
    <div className="pct-barra-fondo">
      <div className="pct-barra" style={{ width: `${p == null ? 0 : p}%`, background: colorPercentil(p) }} />
      <span className="pct-num">{p == null ? '—' : p}</span>
    </div>
  );

  const subtitulo = soloHistorico
    ? `Última temporada registrada: ${etiquetaTemp(carrera.ultimaTemporada)} · no juega en la temporada seleccionada`
    : null;

  const tituloProduccion = soloHistorico
    ? `Temporada ${etiquetaTemp(carrera.ultimaTemporada)} · Producción`
    : 'Temporada actual · Producción';

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="ficha-cabecera">
        <div>
          <h2 className="ficha-nombre">{carrera.nombre}</h2>
          <p className="lema">
            {soloHistorico ? subtitulo : (
              <>
                {carrera.etapas.map((e, i) => (
                  <span key={e.equipoId}>
                    {i > 0 && ' → '}
                    {enlaceEquipo(e)} · {e.grupo}
                  </span>
                ))}
                {multiEtapa && '  ·  (totales combinados de todas las etapas)'}
              </>
            )}
          </p>
        </div>
        <div className="datos-bloque">
          <div className="datos-titulo">{tituloProduccion}</div>
          <div className="datos">
            {dato('PJ', carrera.pj, true)}
            {dato('MIN', carrera.minPorPartido)}
            {dato('PTS', carrera.ptPorPartido)}
            {dato('RO', carrera.roPorPartido)}
            {dato('RD', carrera.rdPorPartido)}
            {dato('REB', carrera.rtPorPartido)}
            {dato('AST', carrera.asPorPartido)}
            {dato('ROB', carrera.brPorPartido)}
            {dato('TAP', carrera.tpPorPartido)}
            {dato('BP', carrera.bpPorPartido)}
            {dato('VAL', carrera.vaPorPartido)}
          </div>
        </div>
      </div>

      {hayDetalle && (
        <div className="grupos" style={{ marginTop: 4 }}>
          <button className={`boton-grupo ${vista === 'resumen' ? 'activo' : ''}`}
            onClick={() => setVista('resumen')}>Resumen</button>
          <button className={`boton-grupo ${vista === 'detalle' ? 'activo' : ''}`}
            onClick={() => setVista('detalle')}>Detalle</button>
        </div>
      )}

      {/* ---------------------------------------------------------- RESUMEN */}
      {enResumen && (<>

        {pct && (
          <>
            <h3 className="seccion">Percentiles {soloHistorico ? `· ${etiquetaTemp(carrera.ultimaTemporada)}` : '· temporada actual'}</h3>
            <div className="pct-panel">
              <div className="pct-cabecera">
                <span></span>
                <span className="pct-col-tit">Nacional</span>
                <span className="pct-col-tit">Su grupo</span>
              </div>
              {METRICAS_PCT.map(m => {
                const d = pct[m.clave];
                if (!d) return null;
                return (
                  <div className="pct-fila" key={m.clave}>
                    <span className="pct-etiqueta">{m.titulo}</span>
                    {barra(d.nac)}
                    {barra(d.grp)}
                  </div>
                );
              })}
              <p className="pie" style={{ marginTop: 8 }}>
                Percentil respecto a jugadores con 12+ partidos. 100 = mejor de la categoría.
                Nacional compara con toda la {competicionNombre}; grupo, solo con su grupo.
              </p>
            </div>
          </>
        )}

        {pct && jugadores && jugadores.length > 0 && (
          <RadarJugador carrera={carrera} jugadores={jugadores} />
        )}

        {trayectoria.length >= 1 && (
          <>
            <h3 className="seccion">Trayectoria por temporada</h3>
            <div className="tabla-scroll tabla-ancha">
              <table>
                <thead>
                  <tr>
                    <th className="izq">Temporada</th><th className="izq">Equipo(s)</th>
                    <th>PJ</th><th>MIN</th><th>PTS</th>
                    <th>RO</th><th>RD</th><th>REB</th><th>AST</th>
                    <th>ROB</th><th>BP</th><th>TAP</th><th>TR</th><th>FC</th><th>FR</th>
                    <th>T2%</th><th>T3%</th><th>TL%</th>
                    <th>VAL</th><th>TS%</th>
                  </tr>
                </thead>
                <tbody>
                  {trayectoria.map(t => (
                    <tr key={t.temp}>
                      <td className="izq">{etiquetaTemp(t.temp)}</td>
                      <td className="izq">{t.equipos.join(', ')}</td>
                      <td>{t.pj}</td><td>{t.minPorPartido}</td><td>{t.ptPorPartido}</td>
                      <td>{t.roPorPartido}</td><td>{t.rdPorPartido}</td><td>{t.rtPorPartido}</td>
                      <td>{t.asPorPartido}</td><td>{t.brPorPartido}</td><td>{t.bpPorPartido}</td>
                      <td>{t.tpPorPartido}</td><td>{t.tcoPorPartido}</td>
                      <td>{t.fcPorPartido}</td><td>{t.frPorPartido}</td>
                      <td>{t.t2Pct}</td><td>{t.t3Pct}</td><td>{t.tlPct}</td>
                      <td>{t.vaPorPartido}</td><td>{t.ts}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fila-total">
                    <td className="izq">CARRERA</td>
                    <td className="izq">{historico.carrera.nTemporadas} temporadas</td>
                    <td>{historico.carrera.pj}</td>
                    <td>{historico.carrera.minPorPartido}</td>
                    <td>{historico.carrera.ptPorPartido}</td>
                    <td>{historico.carrera.roPorPartido}</td>
                    <td>{historico.carrera.rdPorPartido}</td>
                    <td>{historico.carrera.rtPorPartido}</td>
                    <td>{historico.carrera.asPorPartido}</td>
                    <td>{historico.carrera.brPorPartido}</td>
                    <td>{historico.carrera.bpPorPartido}</td>
                    <td>{historico.carrera.tpPorPartido}</td>
                    <td>{historico.carrera.tcoPorPartido}</td>
                    <td>{historico.carrera.fcPorPartido}</td>
                    <td>{historico.carrera.frPorPartido}</td>
                    <td>{historico.carrera.t2Pct}</td>
                    <td>{historico.carrera.t3Pct}</td>
                    <td>{historico.carrera.tlPct}</td>
                    <td>{historico.carrera.vaPorPartido}</td>
                    <td>{historico.carrera.ts}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="panel-grafico">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trayectoria.map(t => ({
                  temporada: etiquetaTemp(t.temp),
                  Puntos: t.ptPorPartido, Valoración: t.vaPorPartido
                }))} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
                  <XAxis dataKey="temporada" tick={{ fontSize: 13 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Puntos" fill={COLOR.acento} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Valoración" fill={COLOR.tinta} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="pie" style={{ marginTop: 4 }}>
                Promedios por partido en cada temporada disputada en categorías FEB registradas.
              </p>
            </div>
          </>
        )}
      </>)}

      {/* ---------------------------------------------------------- DETALLE */}
      {hayDetalle && vista === 'detalle' && (<>

        <div className="datos-bloque" style={{ marginTop: 12 }}>
          <div className="datos-titulo">Tiro</div>
          <div className="datos">
            {dato('T2%', carrera.t2Pct)}
            {dato('T3%', carrera.t3Pct)}
            {dato('TL%', carrera.tlPct)}
            {dato('TS%', carrera.ts)}
            {dato('eFG%', carrera.efg)}
          </div>

          <div className="datos-titulo">Impacto en pista</div>
          <div className="datos">
            {dato('+/-', carrera.pm, true)}
            {avanzadas && dato('USG%', avanzadas.usg)}
            {avanzadas && dato('MIN tot.', avanzadas.minTotales, true)}
          </div>

          {avanzadas && (
            <>
              <div className="datos-titulo">Por 40 minutos</div>
              <div className="datos">
                {dato('PTS/40', avanzadas.per40.pt)}
                {dato('REB/40', avanzadas.per40.rt)}
                {dato('AST/40', avanzadas.per40.as)}
                {dato('ROB/40', avanzadas.per40.br)}
                {dato('VAL/40', avanzadas.per40.va)}
              </div>
              <p className="pie" style={{ marginTop: 6 }}>
                Producción normalizada a 40 minutos, la duración de un partido. Permite comparar jugadores con papeles
                distintos, porque descuenta el efecto de jugar más o menos tiempo. El USG% indica
                qué porcentaje de los ataques de su equipo termina él mientras está en pista.
              </p>
            </>
          )}

          <div className="datos-titulo">Disciplina y contacto</div>
          <div className="datos">
            {dato('FC', carrera.fcPorPartido)}
            {dato('FR', carrera.frPorPartido)}
            {dato('TR', carrera.tcoPorPartido)}
          </div>
        </div>

        <h3 className="seccion">{multiEtapa ? 'Etapas · temporada actual' : 'Estadística completa · temporada actual'}</h3>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th className="izq">Equipo</th><th className="izq">Grupo</th>
                <th>PJ</th><th>MIN</th><th>PTS</th><th>RO</th><th>RD</th><th>REB</th>
                <th>AST</th><th>ROB</th><th>BP</th><th>TAP</th><th>FC</th><th>FR</th>
                <th>T2</th><th>T3</th><th>TL</th>
                <th>VAL</th><th>TS%</th><th>eFG%</th><th>USG%</th><th>+/-</th>
              </tr>
            </thead>
            <tbody>
              {carrera.etapas.map(e => (
                <tr key={e.equipoId}>
                  <td className="izq">{enlaceEquipo(e)}</td>
                  <td className="izq">{e.grupo}</td>
                  <td>{e.pj}</td><td>{e.minPorPartido}</td><td>{e.ptPorPartido}</td>
                  <td>{e.roPorPartido}</td><td>{e.rdPorPartido}</td><td>{e.rtPorPartido}</td>
                  <td>{e.asPorPartido}</td><td>{e.brPorPartido}</td><td>{e.bpPorPartido}</td>
                  <td>{e.tpPorPartido}</td><td>{e.fcPorPartido}</td><td>{e.frPorPartido}</td>
                  <td>{e.t2} ({e.t2Pct}%)</td><td>{e.t3} ({e.t3Pct}%)</td><td>{e.tl} ({e.tlPct}%)</td>
                  <td>{e.vaPorPartido}</td><td>{e.ts}</td><td>{e.efg}</td><td>{e.usg}</td><td>{e.pm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pie">
          Los tiros (T2, T3, TL) se muestran como anotados/intentados totales de la etapa,
          con el porcentaje entre paréntesis. El resto son medias por partido.
        </p>

        <h3 className="seccion">Evolución por jornada · temporada actual</h3>
        <div className="panel-grafico">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
              <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v, nombre) => [v, nombre === 'pt' ? 'Puntos' : 'Valoración']}
                labelFormatter={(j, datos) => {
                  const d = datos && datos[0] && datos[0].payload;
                  return `Jornada ${j}${d ? ` · ${d.equipo} · ${d.min} min` : ''}`;
                }}
              />
              <Legend formatter={v => v === 'pt' ? 'Puntos' : 'Valoración'} />
              <Line type="monotone" dataKey="pt" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="va" stroke={COLOR.tinta} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {fasesJugador && (
          <>
            <h3 className="seccion">
              Fases finales · {fasesJugador.pj} {fasesJugador.pj === 1 ? 'partido' : 'partidos'}
            </h3>
            <div className="datos-bloque">
              <div className="datos">
                {dato('PJ', fasesJugador.pj, true)}
                {dato('MIN', fasesJugador.minPorPartido)}
                {dato('PTS', fasesJugador.ptPorPartido)}
                {dato('REB', fasesJugador.rtPorPartido)}
                {dato('AST', fasesJugador.asPorPartido)}
                {dato('ROB', fasesJugador.brPorPartido)}
                {dato('BP', fasesJugador.bpPorPartido)}
                {dato('VAL', fasesJugador.vaPorPartido)}
                {dato('T2%', fasesJugador.t2Pct)}
                {dato('T3%', fasesJugador.t3Pct)}
                {dato('TL%', fasesJugador.tlPct)}
                {dato('TS%', fasesJugador.ts)}
              </div>
              <p className="pie" style={{ marginTop: 8 }}>
                Promedios en {fasesJugador.fases.join(', ')}.
                {fasesJugador.pj < 3 && ' Con tan pocos partidos, estos promedios describen lo que pasó, no el nivel del jugador: un buen o mal encuentro los mueve por completo.'}
                {' '}Estas cifras no entran en las medias de temporada regular.
              </p>
            </div>
          </>
        )}
      </>)}

      {soloHistorico && (
        <p className="pie">
          Este jugador no aparece en la temporada seleccionada. Se muestra su trayectoria
          en las temporadas registradas. Para ver su detalle por jornada, selecciona una
          temporada en la que haya jugado.
        </p>
      )}
    </div>
  );
}
