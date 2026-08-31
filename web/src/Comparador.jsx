import { useEffect, useState, useMemo } from 'react';

// Comparador de jugadores de cualquier categoría. Carga bajo demanda las listas
// de jugadores de las tres competiciones (solo al entrar aquí) y permite
// enfrentar 2-4 jugadores con valor crudo + percentil en su categoría.
const COMPS = [
  { id: '1', slug: 'primerafeb', nombre: 'Primera FEB' },
  { id: '2', slug: 'segundafeb', nombre: 'Segunda FEB' },
  { id: '3', slug: 'tercerafeb', nombre: 'Tercera FEB' },
];

export default function Comparador({ temporada = '2025' }) {
  const [cargando, setCargando] = useState(true);
  const [jugadoresTodos, setJugadoresTodos] = useState([]);
  const [error, setError] = useState(false);

  // Carga bajo demanda: las tres listas de jugadores, etiquetando cada uno con su categoría
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

  if (cargando) return <p className="cargando">Cargando jugadores de las tres categorías…</p>;
  if (error) return <p className="cargando">No se pudieron cargar los datos del comparador.</p>;

  return (
    <div className="comparador">
      <h2 className="seccion">Comparador de jugadores</h2>
      <p className="pie">
        {jugadoresTodos.length} jugadores cargados de las tres categorías. (Selector y tabla en construcción.)
      </p>
    </div>
  );
}
