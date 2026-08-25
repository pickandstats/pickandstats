import ConsentBanner from './ConsentBanner';
import CintaNav from './CintaNav';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Routes, Route } from 'react-router-dom';
import Inicio from './Inicio';
import Equipos from './Equipos';
import Jugadores from './Jugadores';
import Equipo from './Equipo';
import Leyenda from './Leyenda';
import Jugador from './Jugador';
import Partido from './Partido';
import Clasificacion from './Clasificacion';
import Partidos from './Partidos';
import Buscador from './Buscador';

// Competiciones disponibles (con datos). Al bajar Primera/Segunda, se añaden aquí.
const COMPETICIONES = [
  { id: 'tercerafeb', nombre: 'Tercera FEB' },
  { id: 'segundafeb', nombre: 'Segunda FEB' },
  { id: 'primerafeb', nombre: 'Primera FEB' },
];

const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

// Orden natural de grupos: A-A, A-B, ... o ESTE/OESTE o UNICO
const ordenarGrupos = grupos => [...grupos].sort((a, b) => a.localeCompare(b, 'es'));


// Resuelve la ficha de equipo desde la URL: lee :idClub y busca el equipo ya cargado.
function RutaEquipo({ equipos, jugadores, partidos, cargando, onVolver, onVerEquipo, onVerJugador, onVerPartido }) {
  const { idClub } = useParams();
  if (cargando) return <p className="cargando">Cargando datos…</p>;
  const equipo = equipos.find(e => e.idClub === idClub);
  if (!equipo) return <p className="cargando">Equipo no encontrado en esta temporada.</p>;
  return (
    <Equipo equipo={equipo} jugadores={jugadores} partidos={partidos}
      equipos={equipos} onVolver={onVolver}
      onVerEquipo={onVerEquipo} onVerJugador={onVerJugador} onVerPartido={onVerPartido} />
  );
}

// Ficha de jugador desde la URL. Resuelve primero en carreras (temporada actual)
// y, si no está, reconstruye desde el histórico.
function RutaJugador({ carreras, historico, equipos, jugadores, competicion, temporada,
                       competicionNombre, cargando,
                       carreraDesdeHistorico, onVolver, onVerEquipo }) {
  const { idJugador } = useParams();
  if (cargando) return <p className="cargando">Cargando datos…</p>;
  let carrera = carreras.find(x => String(x.idJugador) === idJugador);
  if (!carrera) {
    const h = historico.find(x => String(x.idJugador) === idJugador);
    if (h) carrera = carreraDesdeHistorico(h);
  }
  if (!carrera) return <p className="cargando">Jugador no encontrado en esta competición.</p>;
  const hist = historico.find(h => String(h.idJugador) === idJugador);
  return (
    <Jugador carrera={carrera} historico={hist} equipos={equipos} jugadores={jugadores}
      competicion={competicion} temporada={temporada}
      competicionNombre={competicionNombre} onVolver={onVolver} onVerEquipo={onVerEquipo} />
  );
}

// Ficha de partido desde la URL (solo liga regular: las fases no están en partidos.json).
function RutaPartido({ partidos, equipos, cargando, onVolver, onVerEquipo, onVerJugador }) {
  const { idPartido } = useParams();
  if (cargando) return <p className="cargando">Cargando datos…</p>;
  const partido = partidos.find(x => String(x.id) === idPartido);
  if (!partido) return <p className="cargando">Partido no encontrado en esta temporada.</p>;
  return (
    <Partido partido={partido} equipos={equipos}
      onVolver={onVolver} onVerEquipo={onVerEquipo} onVerJugador={onVerJugador} />
  );
}

export default function App() {
  const [competicion, setCompeticion] = useState(COMPETICIONES[0].id);
  const navigate = useNavigate();
  const params = useParams();
  const [temporadas, setTemporadas] = useState([]);
  const [temporada, setTemporada] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [vista, setVista] = useState('inicio');
  const [equipoSel, setEquipoSel] = useState(null);
  const [jugadorSel, setJugadorSel] = useState(null);
  const [partidoSel, setPartidoSel] = useState(null);
  const [estadoDatos, setEstadoDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sinDatos, setSinDatos] = useState(false);

  // temporadas e histórico, por competición
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/estado.json`)
      .then(r => r.json()).then(setEstadoDatos).catch(() => {});
  }, []);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/temporadas.json`)
      .then(r => r.json())
      .then(ts => { setTemporadas(ts); setTemporada(ts[0]); })
      .catch(err => console.error('Error cargando temporadas:', err));
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/historico.json`)
      .then(r => r.json())
      .then(setHistorico)
      .catch(err => console.error('Error cargando histórico:', err));
  }, [competicion]);

  // datos de la competición + temporada activas
  useEffect(() => {
    if (!temporada) return;
    setCargando(true);
    setSinDatos(false);
    setEquipos([]); setJugadores([]); setCarreras([]); setPartidos([]);
    const base = `${import.meta.env.BASE_URL}data/${competicion}/${temporada}`;
    const cargar = url => fetch(url).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    });
    Promise.all([
      cargar(`${base}/equipos.json`),
      cargar(`${base}/jugadores.json`),
      cargar(`${base}/carreras.json`),
      cargar(`${base}/partidos.json`)
    ])
      .then(([eq, jug, car, par]) => {
        setEquipos(eq); setJugadores(jug); setCarreras(car); setPartidos(par);
        setEquipoSel(null); setJugadorSel(null); setPartidoSel(null); setCargando(false);
      })
      .catch(err => {
        console.error('Error cargando datos:', err);
        setEquipoSel(null); setJugadorSel(null); setPartidoSel(null);
        setSinDatos(true); setCargando(false);
      });
  }, [competicion, temporada]);

  const location = useLocation();

  // La URL manda: si trae /:comp/:temp/..., alineamos competicion y temporada.
  // Esto hace que un enlace pegado o una recarga reconstruyan la vista correcta.
  useEffect(() => {
    const m = location.pathname.match(/^\/(primerafeb|segundafeb|tercerafeb)\/(\d{4})\//);
    if (!m) return;
    const [, comp, temp] = m;
    if (comp !== competicion) setCompeticion(comp);
    if (temp !== temporada && temporadas.includes(temp)) setTemporada(temp);
  }, [location.pathname, competicion, temporada, temporadas]);

  // grupos derivados de los equipos cargados (funciona para cualquier competición)
  const grupos = useMemo(
    () => ordenarGrupos([...new Set(equipos.map(e => e.grupo))]),
    [equipos]
  );

  const compActual = COMPETICIONES.find(c => c.id === competicion) || COMPETICIONES[0];

  const verEquipo = equipo => {
    if (equipo && equipo.idClub && temporada) {
      navigate(`/${competicion}/${temporada}/equipo/${equipo.idClub}`);
    } else {
      // sin idClub (dato viejo): comportamiento anterior por estado
      setEquipoSel(equipo); setJugadorSel(null); setPartidoSel(null); window.scrollTo(0, 0);
    }
  };

  const carreraDesdeHistorico = h => {
    const temps = Object.keys(h.temporadas || {}).sort();
    const ultima = temps[temps.length - 1];
    const d = h.temporadas[ultima] || {};
    return {
      idJugador: h.idJugador,
      nombre: h.nombre,
      nEtapas: 1,
      soloHistorico: true,
      pj: d.pj || 0,
      minPorPartido: d.minPorPartido || 0,
      ptPorPartido: d.ptPorPartido || 0,
      roPorPartido: d.roPorPartido || 0,
      rdPorPartido: d.rdPorPartido || 0,
      rtPorPartido: d.rtPorPartido || 0,
      asPorPartido: d.asPorPartido || 0,
      brPorPartido: d.brPorPartido || 0,
      bpPorPartido: d.bpPorPartido || 0,
      tpPorPartido: d.tpPorPartido || 0,
      tcoPorPartido: d.tcoPorPartido || 0,
      fcPorPartido: d.fcPorPartido || 0,
      frPorPartido: d.frPorPartido || 0,
      vaPorPartido: d.vaPorPartido || 0,
      t2Pct: d.t2Pct || 0, t3Pct: d.t3Pct || 0, tlPct: d.tlPct || 0,
      ts: d.ts || 0, efg: d.efg || 0, pm: 0,
      ultimaTemporada: ultima,
      etapas: []
    };
  };

  const verJugador = idJugador => {
    if (temporada) {
      navigate(`/${competicion}/${temporada}/jugador/${idJugador}`);
      window.scrollTo(0, 0);
      return;
    }
    // sin temporada aún: comportamiento anterior por estado
    const c = carreras.find(x => x.idJugador === idJugador);
    if (c) setJugadorSel(c);
    else {
      const h = historico.find(x => x.idJugador === idJugador);
      if (!h) return;
      setJugadorSel(carreraDesdeHistorico(h));
    }
    setEquipoSel(null); setPartidoSel(null); window.scrollTo(0, 0);
  };

  const verPartido = arg => {
    const id = (arg && typeof arg === 'object') ? arg.id : arg;
    const enLiga = partidos.some(x => String(x.id) === String(id));
    if (enLiga && temporada) {
      navigate(`/${competicion}/${temporada}/partido/${id}`);
      window.scrollTo(0, 0);
      return;
    }
    // Partidos de fases: no están en partidos.json, así que se abren por estado
    const p = (arg && typeof arg === 'object') ? arg : partidos.find(x => x.id === arg);
    if (p) { setPartidoSel(p); setEquipoSel(null); setJugadorSel(null); window.scrollTo(0, 0); }
    else console.warn('verPartido: no encuentro el partido', arg);
  };

  const irPestana = v => {
    setVista(v); setEquipoSel(null); setJugadorSel(null); setPartidoSel(null);
    if (/\/(equipo|jugador|partido)\//.test(location.pathname)) navigate('/');
  };

  const cambiarCompeticion = id => {
    setCompeticion(id);
    setEquipoSel(null); setJugadorSel(null); setPartidoSel(null);
  };

  const sinSeleccion = !equipoSel && !jugadorSel && !partidoSel;

  const pestana = (id, texto) => (
    <button className={`pestana ${vista === id && sinSeleccion ? 'activa' : ''}`}
      onClick={() => irPestana(id)}>{texto}</button>
  );

  const histJugadorSel = jugadorSel
    ? historico.find(h => h.idJugador === jugadorSel.idJugador)
    : null;

  const infoDatos = estadoDatos && estadoDatos.competiciones && estadoDatos.competiciones[competicion];
  const fechaDatos = infoDatos && new Date(infoDatos.actualizado).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <>
    <CintaNav />
    <div className="contenedor">
      <div className="cabecera">
        <div className="cabecera-marca">
          <h1 className="titulo-app">Estadísticas avanzadas · {compActual.nombre}</h1>
        </div>
        <div className="cabecera-buscador">
          <Buscador historico={historico} equipos={equipos}
            onVerJugador={verJugador} onVerEquipo={verEquipo} />
        </div>
      </div>

      {COMPETICIONES.length > 1 && (
        <div className="barra-competiciones">
          <span className="barra-temporadas-etiqueta">Competición</span>
          {COMPETICIONES.map(c => (
            <button key={c.id}
              className={`pastilla-competicion ${c.id === competicion ? 'activa' : ''}`}
              onClick={() => cambiarCompeticion(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="barra-temporadas">
        <span className="barra-temporadas-etiqueta">Temporada</span>
        {temporadas.map(t => (
          <button key={t}
            className={`pastilla-temporada ${t === temporada ? 'activa' : ''}`}
            onClick={() => setTemporada(t)}>
            {etiquetaTemporada(t)}
          </button>
        ))}
      </div>

      <div className="pestanas">
        {pestana('inicio', 'Inicio')}
        {pestana('clasificacion', 'Clasificacion')}
        {pestana('partidos', 'Partidos')}
        {pestana('equipos', 'Equipos')}
        {pestana('jugadores', 'Jugadores')}
        {pestana('leyenda', 'Leyenda')}
      </div>

      <Routes>
        <Route path="/:comp/:temp/equipo/:idClub" element={
          <RutaEquipo
            equipos={equipos} jugadores={jugadores} partidos={partidos}
            cargando={cargando}
            onVolver={() => navigate('/')}
            onVerEquipo={verEquipo} onVerJugador={verJugador} onVerPartido={verPartido} />
        } />
        <Route path="/:comp/:temp/jugador/:idJugador" element={
          <RutaJugador
            carreras={carreras} historico={historico} equipos={equipos} jugadores={jugadores}
            competicion={competicion} temporada={temporada}
            competicionNombre={compActual.nombre} cargando={cargando}
            carreraDesdeHistorico={carreraDesdeHistorico}
            onVolver={() => navigate('/')} onVerEquipo={verEquipo} />
        } />
        <Route path="/:comp/:temp/partido/:idPartido" element={
          <RutaPartido
            partidos={partidos} equipos={equipos} cargando={cargando}
            onVolver={() => navigate('/')}
            onVerEquipo={verEquipo} onVerJugador={verJugador} />
        } />
        <Route path="*" element={<>
      {cargando ? (
        <p className="cargando">Cargando datos…</p>
      ) : sinDatos && vista === 'partidos' ? (
        <Partidos partidos={partidos} competicion={competicion} temporada={temporada}
          competicionNombre={compActual.nombre}
          onVerEquipo={verEquipo} onVerPartido={verPartido} />
      ) : sinDatos && vista === 'leyenda' ? (
        <Leyenda />
      ) : sinDatos ? (
        <div className="sin-datos">
          <h2>Temporada {etiquetaTemporada(temporada)} en preparación</h2>
          <p>
            Todavía no hay datos disponibles para esta temporada. En cuanto
            comience la competición y se disputen las primeras jornadas,
            aquí aparecerán clasificaciones, estadísticas y resultados.
          </p>
          <p className="sin-datos-sug">
            Mientras tanto, puedes consultar temporadas anteriores con el
            selector de arriba, o revisar el calendario completo.
          </p>
        </div>
      ) : partidoSel ? (
        <Partido partido={partidoSel} equipos={equipos}
          onVolver={() => setPartidoSel(null)} onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : jugadorSel ? (
        <Jugador carrera={jugadorSel} historico={histJugadorSel} equipos={equipos} jugadores={jugadores}
          competicion={competicion} temporada={temporada}
          competicionNombre={compActual.nombre}
          onVolver={() => setJugadorSel(null)} onVerEquipo={verEquipo} />
      ) : equipoSel ? (
        <Equipo equipo={equipoSel} jugadores={jugadores} partidos={partidos}
          equipos={equipos} onVolver={() => setEquipoSel(null)}
          onVerEquipo={verEquipo} onVerJugador={verJugador} onVerPartido={verPartido} />
      ) : vista === 'inicio' ? (
        <Inicio equipos={equipos} jugadores={jugadores} partidos={partidos}
          temporada={temporada} competicionNombre={compActual.nombre}
          onVerEquipo={verEquipo} onVerJugador={verJugador} onVerPartido={verPartido} />
      ) : vista === 'clasificacion' ? (
        <Clasificacion partidos={partidos} equipos={equipos} grupos={grupos} temporada={temporada}
          competicion={competicion}
          onVerEquipo={verEquipo} onVerPartido={verPartido} />
      ) : vista === 'partidos' ? (
        <Partidos partidos={partidos} competicion={competicion} temporada={temporada}
          competicionNombre={compActual.nombre}
          onVerEquipo={verEquipo} onVerPartido={verPartido} />
      ) : vista === 'equipos' ? (
        <Equipos equipos={equipos} grupos={grupos} onVerEquipo={verEquipo} />
      ) : vista === 'jugadores' ? (
        <Jugadores jugadores={jugadores} grupos={grupos} equipos={equipos}
          onVerEquipo={verEquipo} onVerJugador={verJugador} />
      ) : (
        <Leyenda />
      )}
        </>} />
      </Routes>

      <p className="pie">
        Datos: baloncestoenvivo.feb.es · Cálculos propios · Partidos por
        sanción/incomparecencia excluidos de las métricas
        {fechaDatos && <> · Datos actualizados el {fechaDatos}</>}
        {' · '}
        <a className="enlace" href="/legal">Aviso legal y privacidad</a>
        {' · '}
        <span className="enlace" onClick={() => window.dispatchEvent(new CustomEvent('abrir-consent'))}>Gestionar cookies</span>
      </p>

      <ConsentBanner />
    </div>
    </>
  );
}
