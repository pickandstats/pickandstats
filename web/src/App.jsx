import { useEffect, useState } from 'react';
import Equipos from './Equipos';
import Jugadores from './Jugadores';
import Equipo from './Equipo';

const GRUPOS = ['A-A','A-B','B-A','B-B','C-A','C-B','D-A','D-B','E-A','E-B'];
const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

export default function App() {
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [vista, setVista] = useState('equipos');
  const [equipoSel, setEquipoSel] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch('data/temporadas.json')
      .then(r => r.json())
      .then(ts => { setTemporadas(ts); setTemporada(ts[0]); })
      .catch(err => console.error('Error cargando temporadas:', err));
  }, []);

  useEffect(() => {
    if (!temporada) return;
    setCargando(true);
    Promise.all([
      fetch(`data/${temporada}/equipos.json`).then(r => r.json()),
      fetch(`data/${temporada}/jugadores.json`).then(r => r.json()),
      fetch(`data/${temporada}/partidos.json`).then(r => r.json())
    ])
      .then(([eq, jug, par]) => {
        setEquipos(eq); setJugadores(jug); setPartidos(par);
        setEquipoSel(null); setCargando(false);
      })
      .catch(err => { console.error('Error cargando datos:', err); setCargando(false); });
  }, [temporada]);

  const verEquipo = equipo => { setEquipoSel(equipo); window.scrollTo(0, 0); };

  return (
    <div className="contenedor">
      <div className="cabecera">
        <div>
          <h1 className="marca">Pick<span>&</span>Stats</h1>
          <p className="lema">Estadísticas avanzadas · Tercera FEB</p>
        </div>
        <label>
          Temporada{' '}
          <select value={temporada || ''} onChange={e => setTemporada(e.target.value)}>
            {temporadas.map(t => <option key={t} value={t}>{etiquetaTemporada(t)}</option>)}
          </select>
        </label>
      </div>

      <div className="pestanas">
        <button className={`pestana ${vista === 'equipos' && !equipoSel ? 'activa' : ''}`}
          onClick={() => { setVista('equipos'); setEquipoSel(null); }}>Equipos</button>
        <button className={`pestana ${vista === 'jugadores' && !equipoSel ? 'activa' : ''}`}
          onClick={() => { setVista('jugadores'); setEquipoSel(null); }}>Jugadores</button>
      </div>

      {cargando ? (
        <p className="cargando">Cargando datos…</p>
      ) : equipoSel ? (
        <Equipo equipo={equipoSel} jugadores={jugadores} partidos={partidos}
          equipos={equipos} onVolver={() => setEquipoSel(null)} onVerEquipo={verEquipo} />
      ) : vista === 'equipos' ? (
        <Equipos equipos={equipos} grupos={GRUPOS} onVerEquipo={verEquipo} />
      ) : (
        <Jugadores jugadores={jugadores} grupos={GRUPOS} equipos={equipos} onVerEquipo={verEquipo} />
      )}

      <p className="pie">
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
      </p>
    </div>
  );
}
