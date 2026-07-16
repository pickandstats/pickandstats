import { useEffect, useMemo, useState } from 'react';

const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];

const COLUMNAS = [
  { clave: 'nombre',  titulo: 'Equipo',  num: false },
  { clave: 'pj',      titulo: 'PJ' },
  { clave: 'pg',      titulo: 'PG' },
  { clave: 'pp',      titulo: 'PP' },
  { clave: 'pace',    titulo: 'Pace',   tip: 'Posesiones por partido' },
  { clave: 'ortg',    titulo: 'ORtg',   tip: 'Puntos por 100 posesiones' },
  { clave: 'drtg',    titulo: 'DRtg',   tip: 'Puntos encajados por 100 posesiones' },
  { clave: 'netrtg',  titulo: 'Net',    tip: 'ORtg - DRtg' },
  { clave: 'efg',     titulo: 'eFG%',   tip: 'Tiro de campo efectivo' },
  { clave: 'tovPct',  titulo: 'TOV%',   tip: 'Pérdidas por 100 posesiones' },
  { clave: 'orbPct',  titulo: 'ORB%',   tip: '% rebote ofensivo' },
  { clave: 'ftRate',  titulo: 'FTr',    tip: 'TL intentados por 100 tiros de campo' },
];

const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

export default function App() {
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [grupo, setGrupo] = useState('E-A');
  const [orden, setOrden] = useState({ clave: 'netrtg', desc: true });
  const [cargando, setCargando] = useState(false);

  // Descubrir temporadas disponibles
  useEffect(() => {
    fetch('/data/temporadas.json')
      .then(r => r.json())
      .then(ts => {
        setTemporadas(ts);
        setTemporada(ts[0]);
      })
      .catch(err => console.error('Error cargando temporadas:', err));
  }, []);

  // Cargar datos al cambiar de temporada
  useEffect(() => {
    if (!temporada) return;
    setCargando(true);
    fetch(`/data/${temporada}/equipos.json`)
      .then(r => r.json())
      .then(datos => { setEquipos(datos); setCargando(false); })
      .catch(err => { console.error('Error cargando equipos:', err); setCargando(false); });
  }, [temporada]);

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
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>PickAndStats</h1>
          <p style={{ color: '#666', marginTop: 0 }}>
            Estadísticas avanzadas · Tercera FEB
          </p>
        </div>
        <label style={{ fontSize: 14, color: '#333' }}>
          Temporada{' '}
          <select value={temporada || ''} onChange={e => setTemporada(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
            {temporadas.map(t => (
              <option key={t} value={t}>{etiquetaTemporada(t)}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ margin: '16px 0' }}>
        {GRUPOS.map(g => (
          <button key={g} onClick={() => setGrupo(g)}
            style={{
              marginRight: 6, marginBottom: 6, padding: '6px 12px', cursor: 'pointer',
              border: '1px solid #ccc', borderRadius: 6,
              background: g === grupo ? '#1a1a2e' : '#fff',
              color: g === grupo ? '#fff' : '#333'
            }}>
            {g}
          </button>
        ))}
      </div>

      {cargando ? (
        <p style={{ color: '#666' }}>Cargando datos…</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={est.th}>#</th>
              {COLUMNAS.map(c => (
                <th key={c.clave} title={c.tip || ''} onClick={() => clicOrden(c.clave)}
                  style={{ ...est.th, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {c.titulo}{orden.clave === c.clave ? (orden.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 ? '#fafafa' : '#fff' }}>
                <td style={est.td}>{i + 1}</td>
                {COLUMNAS.map(c => (
                  <td key={c.clave} style={{
                    ...est.td,
                    textAlign: c.num === false ? 'left' : 'right',
                    fontWeight: c.clave === 'netrtg' ? 600 : 400,
                    color: c.clave === 'netrtg' ? (e.netrtg > 0 ? '#0a7d33' : '#c0392b') : '#222'
                  }}>
                    {e[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
      </p>
    </div>
  );
}

const est = {
  th: { borderBottom: '2px solid #1a1a2e', padding: '8px 6px', textAlign: 'right', background: '#f4f4f8' },
  td: { borderBottom: '1px solid #eee', padding: '6px' }
};
