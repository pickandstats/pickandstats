import { useEffect, useState, useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';

// Comparador de jugadores de cualquier categoría. Carga bajo demanda las listas
// de jugadores de las tres competiciones y permite enfrentar 2-4 jugadores con
// valor crudo + percentil en su categoría. Filtros en cascada (categoría →
// equipo → nombre) para reducir de ~3000 jugadores a una selección cómoda.
const COMPS = [
  { id: '1', slug: 'primerafeb', nombre: 'Primera FEB' },
  { id: '2', slug: 'segundafeb', nombre: 'Segunda FEB' },
  { id: '3', slug: 'tercerafeb', nombre: 'Tercera FEB' },
];
const MAX = 4;
// Colores distinguibles para hasta 4 jugadores superpuestos en el radar
const COLORES = ['#e8622c', '#16233a', '#0a7d33', '#7b3f9e'];
// Ejes del radar (percentiles): 6 para que se lea bien
const EJES_RADAR = [
  { k: 'ptPorPartido', t: 'Puntos' },
  { k: 'rtPorPartido', t: 'Rebotes' },
  { k: 'asPorPartido', t: 'Asistencias' },
  { k: 'brPorPartido', t: 'Robos' },
  { k: 'ts', t: 'Eficiencia (TS%)' },
  { k: 't3Pct', t: 'Triple' },
];
const apellido = n => String(n).split(',')[0].trim();

const METRICAS = [
  { k: 'ptPorPartido', etiq: 'Puntos', dec: 1 },
  { k: 'rtPorPartido', etiq: 'Rebotes', dec: 1 },
  { k: 'asPorPartido', etiq: 'Asistencias', dec: 1 },
  { k: 'brPorPartido', etiq: 'Robos', dec: 1 },
  { k: 'vaPorPartido', etiq: 'Valoración', dec: 1 },
  { k: 'ts', etiq: 'TS%', dec: 1 },
  { k: 'efg', etiq: 'eFG%', dec: 1 },
  { k: 't3Pct', etiq: 'Triple %', dec: 1 },
];
const CONTEXTO = [
  { k: 'minPorPartido', etiq: 'Minutos', dec: 1 },
  { k: 'pj', etiq: 'Partidos', dec: 0 },
];

export default function Comparador({ temporada = '2025' }) {
  const [cargando, setCargando] = useState(true);
  const [jugadoresTodos, setJugadoresTodos] = useState([]);
  const [error, setError] = useState(false);

  const [catSel, setCatSel] = useState('');
  const [equipoSel, setEquipoSel] = useState('');
  const [busca, setBusca] = useState('');
  const [elegidos, setElegidos] = useState([]);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(false);
    Promise.all(COMPS.map(c =>
      fetch(`${import.meta.env.BASE_URL}data/${c.slug}/${temporada}/jugadores.json`)
        .then(r => r.ok ? r.json() : [])
        .then(arr => (arr || []).map(j => ({ ...j, _cat: c.nombre, _catId: c.id })))
        .catch(() => [])
    )).then(listas => {
      if (!vivo) return;
      const todos = listas.flat();
      setJugadoresTodos(todos);
      setCargando(false);
      if (todos.length === 0) setError(true);
    });
    return () => { vivo = false; };
  }, [temporada]);

  const equiposDeCat = useMemo(() => {
    const src = catSel ? jugadoresTodos.filter(j => j._catId === catSel) : jugadoresTodos;
    const set = new Map();
    src.forEach(j => { if (j.equipo) set.set(j.equipo, j.equipo); });
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [jugadoresTodos, catSel]);

  const filtrados = useMemo(() => {
    let arr = jugadoresTodos;
    if (catSel) arr = arr.filter(j => j._catId === catSel);
    if (equipoSel) arr = arr.filter(j => j.equipo === equipoSel);
    if (busca.trim().length >= 2) {
      const t = busca.trim().toLowerCase();
      arr = arr.filter(j => (j.nombre || '').toLowerCase().includes(t));
    }
    if (!equipoSel && busca.trim().length < 2) return null;
    return arr.slice(0, 60);
  }, [jugadoresTodos, catSel, equipoSel, busca]);

  const yaElegido = id => elegidos.some(j => String(j.idJugador) === String(id));
  const anadir = j => {
    if (yaElegido(j.idJugador) || elegidos.length >= MAX) return;
    setElegidos([...elegidos, j]);
  };
  const quitar = id => setElegidos(elegidos.filter(j => String(j.idJugador) !== String(id)));

  const pctDe = (j, k) => (j.percentiles && j.percentiles[k] ? j.percentiles[k].nac : null);
  const catsMezcladas = new Set(elegidos.map(j => j._catId)).size > 1;

  // Datos del radar: una fila por eje, con el percentil de cada jugador elegido.
  // Percentiles (0-100) para que la comparacion sea justa entre categorias.
  const datosRadar = useMemo(() => EJES_RADAR.map(e => {
    const fila = { eje: e.t };
    elegidos.forEach((j, i) => {
      const p = pctDe(j, e.k);
      fila["j" + i] = p != null ? p : 0;
    });
    return fila;
  }), [elegidos]);

  // Índice del mejor de cada métrica, por percentil (comparación justa entre categorías)
  const mejorPorFila = k => {
    let mejor = -1, idx = -1;
    elegidos.forEach((j, i) => {
      const p = pctDe(j, k);
      if (p != null && p > mejor) { mejor = p; idx = i; }
    });
    return idx;
  };

  if (cargando) return <p className="cargando">Cargando jugadores de las tres categorías…</p>;
  if (error) return <p className="cargando">No se pudieron cargar los datos del comparador.</p>;

  return (
    <div className="comparador">
      <h2 className="seccion">Comparador de jugadores</h2>

      {elegidos.length > 0 && (
        <div className="comparador-elegidos">
          {elegidos.map(j => (
            <div key={j.idJugador} className="comparador-ficha">
              <span className="comparador-ficha-nombre">{j.nombre}</span>
              <span className="comparador-ficha-cat">{j.equipo} · {j._cat}</span>
              <button className="comparador-quitar" onClick={() => quitar(j.idJugador)} aria-label="Quitar">×</button>
            </div>
          ))}
          {elegidos.length < MAX && <span className="comparador-hueco">+ añade hasta {MAX}</span>}
        </div>
      )}

      <div className="comparador-filtros">
        <select value={catSel} onChange={e => { setCatSel(e.target.value); setEquipoSel(''); }}>
          <option value="">Todas las categorías</option>
          {COMPS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={equipoSel} onChange={e => setEquipoSel(e.target.value)}>
          <option value="">{catSel ? 'Todos los equipos' : 'Elige categoría o equipo'}</option>
          {equiposDeCat.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
        <input type="text" placeholder="Buscar por nombre…" value={busca}
          onChange={e => setBusca(e.target.value)} />
      </div>

      {filtrados === null ? (
        <p className="pie">Elige un equipo o escribe un nombre para ver jugadores.</p>
      ) : filtrados.length === 0 ? (
        <p className="pie">Ningún jugador con esos filtros.</p>
      ) : (
        <div className="comparador-lista">
          {filtrados.map(j => (
            <button key={j.idJugador + j._catId} className="comparador-item"
              disabled={yaElegido(j.idJugador) || elegidos.length >= MAX}
              onClick={() => anadir(j)}>
              <span className="comparador-item-nombre">{j.nombre}</span>
              <span className="comparador-item-meta">{j.equipo} · {j._cat} · {j.pj}pj</span>
            </button>
          ))}
        </div>
      )}

      {elegidos.length < 2 ? (
        <p className="pie">Añade al menos 2 jugadores para compararlos.</p>
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="comparador-tabla">
              <thead>
                <tr>
                  <th className="izq">Métrica</th>
                  {elegidos.map(j => (
                    <th key={j.idJugador}>
                      <div className="comparador-th-nombre">{j.nombre}</div>
                      <div className="comparador-th-cat">{j._cat}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICAS.map(m => {
                  const mejor = mejorPorFila(m.k);
                  return (
                    <tr key={m.k}>
                      <td className="izq">{m.etiq}</td>
                      {elegidos.map((j, i) => {
                        const v = j[m.k];
                        const p = pctDe(j, m.k);
                        return (
                          <td key={j.idJugador} className={i === mejor ? 'comparador-mejor' : ''}>
                            <span className="comparador-crudo">{v != null ? v.toFixed(m.dec) : '—'}</span>
                            {p != null && <span className="comparador-pct">P{p}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {CONTEXTO.map(m => (
                  <tr key={m.k} className="comparador-fila-ctx">
                    <td className="izq">{m.etiq}</td>
                    {elegidos.map(j => (
                      <td key={j.idJugador}>
                        <span className="comparador-crudo">{j[m.k] != null ? j[m.k].toFixed(m.dec) : '—'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pie">
            Cada celda muestra el valor por partido y, debajo, el percentil dentro de su categoría (P = mejor que ese % de jugadores de su categoría).
            {catsMezcladas && ' Como comparas jugadores de categorías distintas, el percentil es la referencia justa: el valor crudo no es directamente equiparable entre categorías.'}
            {' '}El resaltado marca el mejor percentil de cada fila.
          </p>

          <h3 className="seccion" style={{ marginTop: 20 }}>Perfil comparado</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={datosRadar} outerRadius="72%">
                <PolarGrid stroke="#e3e6eb" />
                <PolarAngleAxis dataKey="eje" tick={{ fontSize: 12, fill: '#5b6472' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
                <Tooltip formatter={(v, n) => {
                  const i = +String(n).replace('j', '');
                  return [`percentil ${v}`, elegidos[i] ? apellido(elegidos[i].nombre) : ''];
                }} />
                <Legend formatter={n => {
                  const i = +String(n).replace('j', '');
                  return elegidos[i] ? apellido(elegidos[i].nombre) : '';
                }} />
                {elegidos.map((j, i) => (
                  <Radar key={j.idJugador} name={"j" + i} dataKey={"j" + i}
                    stroke={COLORES[i % COLORES.length]} fill={COLORES[i % COLORES.length]}
                    fillOpacity={0.18} strokeWidth={2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="pie">Cada eje es el percentil dentro de su categoría (0-100). Cuanto más hacia fuera, mejor respecto a su categoría.</p>
        </>
      )}
    </div>
  );
}
