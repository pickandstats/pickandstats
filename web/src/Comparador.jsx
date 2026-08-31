import { useEffect, useState, useMemo } from 'react';

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
    // Requiere equipo o nombre para listar (no volcar toda una categoria de golpe)
    if (!equipoSel && busca.trim().length < 2) return null;
    return arr.slice(0, 60);
  }, [jugadoresTodos, catSel, equipoSel, busca]);

  const yaElegido = id => elegidos.some(j => String(j.idJugador) === String(id));
  const anadir = j => {
    if (yaElegido(j.idJugador) || elegidos.length >= MAX) return;
    setElegidos([...elegidos, j]);
  };
  const quitar = id => setElegidos(elegidos.filter(j => String(j.idJugador) !== String(id)));

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

      {elegidos.length >= 2
        ? <p className="pie">Tabla comparativa en construcción ({elegidos.length} elegidos).</p>
        : <p className="pie">Añade al menos 2 jugadores para compararlos.</p>}
    </div>
  );
}
