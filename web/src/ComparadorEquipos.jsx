import { useEffect, useState, useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';

// Comparador de equipos de cualquier categoría (datos de temporada). Selección
// simple (categoría → equipo, hay pocos equipos), tabla crudo + percentil y
// radar de perfil. Percentiles para comparación justa entre categorías.
const COMPS = [
  { id: '1', slug: 'primerafeb', nombre: 'Primera FEB' },
  { id: '2', slug: 'segundafeb', nombre: 'Segunda FEB' },
  { id: '3', slug: 'tercerafeb', nombre: 'Tercera FEB' },
];
const MAX = 4;
const COLORES = ['#e8622c', '#16233a', '#0a7d33', '#7b3f9e'];

// Métricas de la tabla: crudo + percentil. 'inv' = menos es mejor (para leer el percentil).
const METRICAS = [
  { k: 'ortg', etiq: 'Rating ofensivo', dec: 1 },
  { k: 'drtg', etiq: 'Rating defensivo', dec: 1, inv: true },
  { k: 'pfPartido', etiq: 'Puntos a favor', dec: 1 },
  { k: 'pcPartido', etiq: 'Puntos en contra', dec: 1, inv: true },
  { k: 'rebPartido', etiq: 'Rebotes', dec: 1 },
  { k: 'asPartido', etiq: 'Asistencias', dec: 1 },
  { k: 'brPartido', etiq: 'Robos', dec: 1 },
  { k: 'bpPartido', etiq: 'Pérdidas', dec: 1, inv: true },
  { k: 'pace', etiq: 'Ritmo (pace)', dec: 1, neutra: true },
  { k: 't2PctEq', etiq: '% Tiros de 2', dec: 1 },
  { k: 't3PctEq', etiq: '% Tiros de 3', dec: 1 },
];
// Ejes del radar (percentiles; inversas corregidas para que "más fuera = mejor")
const EJES_RADAR = [
  { k: 'ortg', t: 'Ataque' },
  { k: 'drtg', t: 'Defensa', inv: true },
  { k: 'rebPartido', t: 'Rebote' },
  { k: 'asPartido', t: 'Asistencias' },
  { k: 'brPartido', t: 'Robos' },
  { k: 'pace', t: 'Ritmo' },
];

export default function ComparadorEquipos({ temporada = '2025' }) {
  const [cargando, setCargando] = useState(true);
  const [equiposTodos, setEquiposTodos] = useState([]);
  const [error, setError] = useState(false);
  const [catSel, setCatSel] = useState('');
  const [elegidos, setElegidos] = useState([]);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(false);
    Promise.all(COMPS.map(c =>
      fetch(`${import.meta.env.BASE_URL}data/${c.slug}/${temporada}/equipos.json`)
        .then(r => r.ok ? r.json() : [])
        .then(arr => (arr || []).map(e => ({ ...e, _cat: c.nombre, _catId: c.id })))
        .catch(() => [])
    )).then(listas => {
      if (!vivo) return;
      const todos = listas.flat();
      setEquiposTodos(todos);
      setCargando(false);
      if (todos.length === 0) setError(true);
    });
    return () => { vivo = false; };
  }, [temporada]);

  const equiposDeCat = useMemo(() => {
    if (!catSel) return [];
    return equiposTodos.filter(e => e._catId === catSel)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [equiposTodos, catSel]);

  const yaElegido = id => elegidos.some(e => String(e.id) === String(id));
  const anadir = e => {
    if (!e || yaElegido(e.id) || elegidos.length >= MAX) return;
    setElegidos([...elegidos, e]);
  };
  const quitar = id => setElegidos(elegidos.filter(e => String(e.id) !== String(id)));

  const pctDe = (e, k) => (e.percentiles && e.percentiles[k] ? e.percentiles[k].nac : null);
  const catsMezcladas = new Set(elegidos.map(e => e._catId)).size > 1;

  // Mejor de cada fila por percentil (corrigiendo inversas)
  const mejorPorFila = (k, inv) => {
    let mejor = -1, idx = -1;
    elegidos.forEach((e, i) => {
      let p = pctDe(e, k);
      if (p == null) return;
      if (inv) p = 100 - p;
      if (p > mejor) { mejor = p; idx = i; }
    });
    return idx;
  };

  const datosRadar = useMemo(() => EJES_RADAR.map(e => {
    const fila = { eje: e.t };
    elegidos.forEach((eq, i) => {
      let p = pctDe(eq, e.k);
      if (p != null && e.inv) p = 100 - p;
      fila['e' + i] = p != null ? p : 0;
    });
    return fila;
  }), [elegidos]);

  if (cargando) return <p className="cargando">Cargando equipos de las tres categorías…</p>;
  if (error) return <p className="cargando">No se pudieron cargar los datos.</p>;

  return (
    <div className="comparador">
      <h2 className="seccion">Comparador de equipos</h2>

      {elegidos.length > 0 && (
        <div className="comparador-elegidos">
          {elegidos.map(e => (
            <div key={e.id} className="comparador-ficha">
              <span className="comparador-ficha-nombre">{e.nombre}</span>
              <span className="comparador-ficha-cat">{e._cat}</span>
              <button className="comparador-quitar" onClick={() => quitar(e.id)} aria-label="Quitar">×</button>
            </div>
          ))}
          {elegidos.length < MAX && <span className="comparador-hueco">+ añade hasta {MAX}</span>}
        </div>
      )}

      <div className="comparador-filtros">
        <select value={catSel} onChange={e => setCatSel(e.target.value)}>
          <option value="">Elige categoría…</option>
          {COMPS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value="" disabled={!catSel} onChange={e => {
          const eq = equiposDeCat.find(x => String(x.id) === e.target.value);
          anadir(eq);
        }}>
          <option value="">{catSel ? 'Añade un equipo…' : 'Elige categoría primero'}</option>
          {equiposDeCat.map(eq => (
            <option key={eq.id} value={eq.id} disabled={yaElegido(eq.id)}>{eq.nombre}</option>
          ))}
        </select>
      </div>

      {elegidos.length < 2 ? (
        <p className="pie">Añade al menos 2 equipos para compararlos.</p>
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="comparador-tabla">
              <thead>
                <tr>
                  <th className="izq">Métrica</th>
                  {elegidos.map(e => (
                    <th key={e.id}>
                      <div className="comparador-th-nombre">{e.nombre}</div>
                      <div className="comparador-th-cat">{e._cat}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICAS.map(m => {
                  const mejor = m.neutra ? -1 : mejorPorFila(m.k, m.inv);
                  return (
                    <tr key={m.k}>
                      <td className="izq">{m.etiq}{m.inv ? ' ↓' : ''}</td>
                      {elegidos.map((e, i) => {
                        const v = e[m.k]; const p = pctDe(e, m.k);
                        return (
                          <td key={e.id} className={i === mejor ? 'comparador-mejor' : ''}>
                            <span className="comparador-crudo">{v != null ? v.toFixed(m.dec) : '—'}</span>
                            {p != null && <span className="comparador-pct">P{p}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pie">
            Valor por partido y percentil dentro de su categoría. ↓ = en esa métrica, menos es mejor (el resaltado ya lo tiene en cuenta).
            {catsMezcladas && ' Como comparas equipos de categorías distintas, el percentil es la referencia justa.'}
          </p>

          <h3 className="seccion" style={{ marginTop: 20 }}>Perfil comparado</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={datosRadar} outerRadius="72%">
                <PolarGrid stroke="#e3e6eb" />
                <PolarAngleAxis dataKey="eje" tick={{ fontSize: 12, fill: '#5b6472' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
                <Tooltip formatter={(v, n) => {
                  const i = +String(n).replace('e', '');
                  return [`percentil ${v}`, elegidos[i] ? elegidos[i].nombre : ''];
                }} />
                <Legend formatter={n => {
                  const i = +String(n).replace('e', '');
                  return elegidos[i] ? elegidos[i].nombre : '';
                }} />
                {elegidos.map((e, i) => (
                  <Radar key={e.id} name={'e' + i} dataKey={'e' + i}
                    stroke={COLORES[i % COLORES.length]} fill={COLORES[i % COLORES.length]}
                    fillOpacity={0.18} strokeWidth={2} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="pie">Cada eje es el percentil dentro de su categoría (0-100), con defensa ajustada para que más hacia fuera sea siempre mejor.</p>
        </>
      )}
    </div>
  );
}
