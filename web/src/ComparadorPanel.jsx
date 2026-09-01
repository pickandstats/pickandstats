import { useState } from 'react';
import Comparador from './Comparador';
import ComparadorEquipos from './ComparadorEquipos';

// Contenedor con toggle jugadores / equipos.
export default function ComparadorPanel({ temporada = '2025' }) {
  const [modo, setModo] = useState('jugadores');
  return (
    <div>
      <div className="grupos" style={{ marginBottom: 12 }}>
        <button className={`boton-grupo ${modo === 'jugadores' ? 'activo' : ''}`}
          onClick={() => setModo('jugadores')}>Jugadores</button>
        <button className={`boton-grupo ${modo === 'equipos' ? 'activo' : ''}`}
          onClick={() => setModo('equipos')}>Equipos</button>
      </div>
      {modo === 'jugadores'
        ? <Comparador temporada={temporada} />
        : <ComparadorEquipos temporada={temporada} />}
    </div>
  );
}
