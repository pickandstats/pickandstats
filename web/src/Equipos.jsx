import { useEffect, useMemo, useState } from 'react';

const COMUNES = [
  { clave: 'nombre', titulo: 'Equipo', izq: true },
  { clave: 'pj',     titulo: 'PJ' },
  { clave: 'pg',     titulo: 'PG' },
  { clave: 'pp',     titulo: 'PP' },
];

const BASICA = [
  ...COMUNES,
  { clave: 'pfPartido',  titulo: 'PF',   tip: 'Puntos a favor por partido' },
  { clave: 'pcPartido',  titulo: 'PC',   tip: 'Puntos en contra por partido' },
  { clave: 'difPartido', titulo: 'Dif.', tip: 'Diferencia media por partido' },
  { clave: 't2PctEq',    titulo: 'T2%' },
  { clave: 't3PctEq',    titulo: 'T3%' },
  { clave: 'tlPctEq',    titulo: 'TL%' },
  { clave: 'rebPartido', titulo: 'REB',  tip: 'Rebotes totales por partido' },
  { clave: 'asPartido',  titulo: 'AST',  tip: 'Asistencias por partido' },
];

const DETALLE = [
  ...COMUNES,
  { clave: 'roPartido', titulo: 'RO',  tip: 'Rebotes ofensivos por partido' },
  { clave: 'rdPartido', titulo: 'RD',  tip: 'Rebotes defensivos por partido' },
  { clave: 'brPartido', titulo: 'ROB', tip: 'Robos por partido' },
  { clave: 'bpPartido', titulo: 'BP',  tip: 'Pérdidas por partido' },
  { clave: 'fcPartido', titulo: 'FC',  tip: 'Faltas cometidas por partido' },
  { clave: 'frPartido', titulo: 'FR',  tip: 'Faltas recibidas por partido' },
  { clave: 'tapFavor',  titulo: 'TAP', tip: 'Tapones a favor por partido' },
  { clave: 'tapContra', titulo: 'TR',  tip: 'Tapones recibidos por partido' },
];

const EFICIENCIA = [
  ...COMUNES,
  { clave: 'pace',   titulo: 'Pace',  tip: 'Posesiones por partido' },
  { clave: 'ortg',   titulo: 'ORtg',  tip: 'Puntos por 100 posesiones' },
  { clave: 'drtg',   titulo: 'DRtg',  tip: 'Puntos encajados por 100 posesiones' },
  { clave: 'netrtg', titulo: 'Net',   tip: 'ORtg - DRtg' },
  { clave: 'srs',    titulo: 'SRS',   tip: 'Net ajustado por la dificultad del calendario. Solo comparable entre equipos del mismo grupo: los grupos no se cruzan en liga regular' },
  { clave: 'victoriasEsperadas', titulo: 'VE', tip: 'Victorias esperadas segun la diferencia de puntos' },
  { clave: 'suerte', titulo: 'Suerte', tip: 'Victorias reales menos esperadas' },
  { clave: 'forma5', titulo: 'Últ.5', tip: 'Récord últimos 5 partidos' },
];

const FACTORES = [
  ...COMUNES,
  { clave: 'efg',          titulo: 'eFG%',     tip: 'Tiro de campo efectivo' },
  { clave: 'tovPct',       titulo: 'TOV%',     tip: 'Pérdidas por 100 posesiones (menos es mejor)' },
  { clave: 'orbPct',       titulo: 'ORB%',     tip: '% de rebote ofensivo capturado' },
  { clave: 'ftRate',       titulo: 'FTr',      tip: 'TL intentados por 100 tiros de campo' },
  { clave: 'efgRival',     titulo: 'eFG% riv', tip: 'Tiro efectivo que permites al rival (menos es mejor)' },
  { clave: 'tovForzadas',  titulo: 'TOV forz', tip: 'Pérdidas forzadas por 100 posesiones del rival' },
  { clave: 'drbPct',       titulo: 'DRB%',     tip: '% de rebote defensivo asegurado' },
  { clave: 'ftrRival',     titulo: 'FTr riv',  tip: 'TL que concede el rival por 100 tiros suyos (menos es mejor)' },
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

export default function Equipos({ equipos, grupos, onVerEquipo }) {
  const [grupo, setGrupo] = useState(null);

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);
  const [modo, setModo] = useState('basica');
  const [orden, setOrden] = useState({ clave: 'pg', desc: true });
  const cambiarModo = m => { setModo(m); setOrden({ clave: ORDEN_DEFECTO[m] || 'pg', desc: true }); };

  const columnas = (MODOS.find(m => m[0] === modo) || MODOS[0])[2];

  const filas = useMemo(() => {
    const f = equipos.filter(e => e.grupo === grupo);
    const { clave, desc } = orden;
    f.sort((a, b) => {
      const va = a[clave], vb = b[clave];
      if (typeof va === 'string') return desc ? vb.localeCompare(va) : va.localeCompare(vb);
      return desc ? vb - va : va - vb;
    });
    return f;
  }, [equipos, grupo, orden]);

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
                      : e[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
