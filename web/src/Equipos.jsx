import { useEffect, useMemo, useState } from 'react';
import { srsListo, notaSrs } from './srsUtil';
import { FORMATOS } from './formato';

// `fmt` por columna (_instrucciones.md 23/10, punto 4): un campo en la
// configuracion de columnas, no un formateo celda a celda. Las columnas sin
// `fmt` son texto (nombre, forma5) y se pintan tal cual.
const COMUNES = [
  { clave: 'nombre', titulo: 'Equipo', izq: true },
  { clave: 'pj',     titulo: 'PJ', fmt: 'n0' },
  { clave: 'pg',     titulo: 'PG', fmt: 'n0' },
  { clave: 'pp',     titulo: 'PP', fmt: 'n0' },
];

const BASICA = [
  ...COMUNES,
  { clave: 'pfPartido',  titulo: 'PF',   tip: 'Puntos a favor por partido', fmt: 'n1' },
  { clave: 'pcPartido',  titulo: 'PC',   tip: 'Puntos en contra por partido', fmt: 'n1' },
  { clave: 'difPartido', titulo: 'Dif.', tip: 'Diferencia media por partido', fmt: 's1' },
  { clave: 't2PctEq',    titulo: 'T2%', fmt: 'n1' },
  { clave: 't3PctEq',    titulo: 'T3%', fmt: 'n1' },
  { clave: 'tlPctEq',    titulo: 'TL%', fmt: 'n1' },
  { clave: 'rebPartido', titulo: 'REB',  tip: 'Rebotes totales por partido', fmt: 'n1' },
  { clave: 'asPartido',  titulo: 'AST',  tip: 'Asistencias por partido', fmt: 'n1' },
];

const DETALLE = [
  ...COMUNES,
  { clave: 'roPartido', titulo: 'RO',  tip: 'Rebotes ofensivos por partido', fmt: 'n1' },
  { clave: 'rdPartido', titulo: 'RD',  tip: 'Rebotes defensivos por partido', fmt: 'n1' },
  { clave: 'brPartido', titulo: 'ROB', tip: 'Robos por partido', fmt: 'n1' },
  { clave: 'bpPartido', titulo: 'BP',  tip: 'Pérdidas por partido', fmt: 'n1' },
  { clave: 'fcPartido', titulo: 'FC',  tip: 'Faltas cometidas por partido', fmt: 'n1' },
  { clave: 'frPartido', titulo: 'FR',  tip: 'Faltas recibidas por partido', fmt: 'n1' },
  { clave: 'tapFavor',  titulo: 'TAP', tip: 'Tapones a favor por partido', fmt: 'n1' },
  { clave: 'tapContra', titulo: 'TR',  tip: 'Tapones recibidos por partido', fmt: 'n1' },
];

const EFICIENCIA = [
  ...COMUNES,
  { clave: 'pace',   titulo: 'Pace',  tip: 'Posesiones por partido', fmt: 'n1' },
  { clave: 'ortg',   titulo: 'ORtg',  tip: 'Puntos por 100 posesiones', fmt: 'n1' },
  { clave: 'drtg',   titulo: 'DRtg',  tip: 'Puntos encajados por 100 posesiones', fmt: 'n1' },
  { clave: 'netrtg', titulo: 'Net',   tip: 'ORtg - DRtg', fmt: 's1' },
  { clave: 'srs',    titulo: 'SRS',   tip: 'Net ajustado por la dificultad del calendario. Solo comparable entre equipos del mismo grupo: los grupos no se cruzan en liga regular', fmt: 's1' },
  { clave: 'victoriasEsperadas', titulo: 'VE', tip: 'Victorias esperadas segun la diferencia de puntos', fmt: 'n1' },
  { clave: 'suerte', titulo: 'Suerte', tip: 'Victorias reales menos esperadas', fmt: 's1' },
  { clave: 'forma5', titulo: 'Últ.5', tip: 'Récord últimos 5 partidos' },
];

const FACTORES = [
  ...COMUNES,
  { clave: 'efg',          titulo: 'eFG%',     tip: 'Tiro de campo efectivo', fmt: 'n1' },
  { clave: 'tovPct',       titulo: 'TOV%',     tip: 'Pérdidas por 100 posesiones (menos es mejor)', fmt: 'n1' },
  { clave: 'orbPct',       titulo: 'ORB%',     tip: '% de rebote ofensivo capturado', fmt: 'n1' },
  { clave: 'ftRate',       titulo: 'FTr',      tip: 'TL intentados por 100 tiros de campo', fmt: 'n1' },
  { clave: 'efgRival',     titulo: 'eFG% riv', tip: 'Tiro efectivo que permites al rival (menos es mejor)', fmt: 'n1' },
  { clave: 'tovForzadas',  titulo: 'TOV forz', tip: 'Pérdidas forzadas por 100 posesiones del rival', fmt: 'n1' },
  { clave: 'drbPct',       titulo: 'DRB%',     tip: '% de rebote defensivo asegurado', fmt: 'n1' },
  { clave: 'ftrRival',     titulo: 'FTr riv',  tip: 'TL que concede el rival por 100 tiros suyos (menos es mejor)', fmt: 'n1' },
];

// Al cambiar de modo, ordenar por la métrica más relevante de ese modo
const ORDEN_DEFECTO = {
  basica:     'pg',
  detalle:    'roPartido',
  eficiencia: 'netrtg',
  factores:   'efg',
};

const MODOS = [
  ['basica',     'Básica',        BASICA],
  ['detalle',    'Detalle',       DETALLE],
  ['eficiencia', 'Eficiencia',    EFICIENCIA],
  ['factores',   'Four Factors',  FACTORES],
];

export default function Equipos({ equipos, grupos, srsPestillo, onVerEquipo }) {
  const [grupo, setGrupo] = useState(null);

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);
  const [modo, setModo] = useState('basica');
  const [orden, setOrden] = useState({ clave: 'pg', desc: true });
  const cambiarModo = m => { setModo(m); setOrden({ clave: ORDEN_DEFECTO[m] || 'pg', desc: true }); };

  const columnas = (MODOS.find(m => m[0] === modo) || MODOS[0])[2];

  const equiposGrupo = useMemo(() => equipos.filter(e => e.grupo === grupo), [equipos, grupo]);
  const srsOk = srsListo(srsPestillo, grupo);

  const filas = useMemo(() => {
    const f = [...equiposGrupo];
    const { clave, desc } = orden;
    f.sort((a, b) => {
      const va = a[clave], vb = b[clave];
      if (typeof va === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return desc ? vb - va : va - vb;
    });
    return f;
  }, [equiposGrupo, orden]);

  const clicOrden = clave =>
    setOrden(o => o.clave === clave ? { clave, desc: !o.desc } : { clave, desc: true });

  return (
    <>
      <div className="grupos">
        {grupos.map(g => (
          <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
            onClick={() => setGrupo(g)}>{g}</button>
        ))}
        <span className="separador" />
        {MODOS.map(([id, texto]) => (
          <button key={id} className={`boton-grupo ${modo === id ? 'activo' : ''}`}
            onClick={() => cambiarModo(id)}>{texto}</button>
        ))}
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columnas.map(c => (
                <th key={c.clave} title={c.tip || ''} onClick={() => clicOrden(c.clave)}
                  className={c.izq ? 'izq' : ''}>
                  {c.titulo}{orden.clave === c.clave ? (orden.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                {columnas.map(c => (
                  <td key={c.clave}
                    className={[
                      c.izq ? 'izq' : '',
                      (c.clave === 'netrtg' || c.clave === 'difPartido')
                        ? (e[c.clave] > 0 ? 'net-pos' : 'net-neg') : ''
                    ].join(' ').trim()}>
                    {c.clave === 'nombre'
                      ? <span className="enlace" onClick={() => onVerEquipo(e)}>{e.nombre}</span>
                      : c.clave === 'srs' && !srsOk ? '—'
                      : c.fmt ? FORMATOS[c.fmt](e[c.clave]) : e[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modo === 'eficiencia' && !srsOk && <p className="nota-tabla">{notaSrs(equiposGrupo)}</p>}
    </>
  );
}
