import { useEffect, useMemo, useState } from 'react';
import { fusionarPartidos, agruparPorJornada, gruposDePartidos } from './partidosUtil.js';

const fechaLarga = f => {
  if (!f) return '';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
};
const fechaCorta = f => {
  if (!f) return '';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function Partidos({
  partidos, competicion, temporada, competicionNombre,
  onVerEquipo, onVerPartido
}) {
  const [calendario, setCalendario] = useState(undefined); // undefined=cargando, null=no hay
  const [grupo, setGrupo] = useState(null);
  const [jornadaSel, setJornadaSel] = useState(null);

  // Carga el fixture de la temporada activa (puede no existir en temporadas pasadas).
  useEffect(() => {
    setCalendario(undefined);
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/${temporada}/calendario.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCalendario(d?.partidos || null))
      .catch(() => setCalendario(null));
  }, [competicion, temporada]);

  // Fusiona partidos jugados (prop) + fixture (fetch) por id.
  const todos = useMemo(() => {
    if (calendario === undefined) return null; // aún cargando el fixture
    return fusionarPartidos(partidos || [], calendario);
  }, [partidos, calendario]);

  const grupos = useMemo(() => (todos ? gruposDePartidos(todos) : []), [todos]);

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);

  const porJornada = useMemo(
    () => (todos ? agruparPorJornada(todos, grupo) : []),
    [todos, grupo]
  );

  // Jornada por defecto: la primera con algún partido sin jugar (la "próxima"),
  // o la última si están todas jugadas.
  const jornadaPorDefecto = useMemo(() => {
    const proxima = porJornada.find(([, d]) => d.lista.some(p => !p.jugado));
    if (proxima) return proxima[0];
    return porJornada.length ? porJornada[porJornada.length - 1][0] : null;
  }, [porJornada]);

  const jornadaActiva = jornadaSel ?? jornadaPorDefecto;
  const jornadaData = porJornada.find(([n]) => n === jornadaActiva);
  const lista = jornadaData?.[1].lista || [];

  if (todos === null) return <p className="cargando">Cargando partidos…</p>;

  if (!todos.length) {
    return (
      <div>
        <h3 className="seccion">Partidos · {competicionNombre}</h3>
        <p className="aviso-dato">
          Todavía no hay partidos disponibles para esta temporada.
        </p>
      </div>
    );
  }

  const equipoClicId = id => { const e = onVerEquipo && id; if (e) {
    const eq = (partidos || []).flatMap(p => [p.local, p.visitante])
      .find(x => String(x.id) === String(id));
    if (eq) onVerEquipo(eq);
  }};

  const idx = porJornada.findIndex(([n]) => n === jornadaActiva);
  const fechasJornada = [...new Set(lista.map(p => p.fecha).filter(Boolean))].sort();

  return (
    <div>
      <h3 className="seccion">Partidos · {competicionNombre}</h3>

      {grupos.length > 1 && (
        <div className="grupos">
          {grupos.map(g => (
            <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
              onClick={() => { setGrupo(g); setJornadaSel(null); }}>
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="calendario-navegacion">
        <button className="boton-grupo nav-jornada"
          disabled={idx <= 0}
          onClick={() => { if (idx > 0) setJornadaSel(porJornada[idx - 1][0]); }}>‹</button>

        <select className="selector-jornada" value={jornadaActiva ?? ''}
          onChange={e => setJornadaSel(+e.target.value)}>
          {porJornada.map(([n, d]) => (
            <option key={n} value={n}>
              Jornada {n}{d.lista[0]?.fecha ? ' · ' + fechaCorta(d.lista[0].fecha) : ''}
            </option>
          ))}
        </select>

        <button className="boton-grupo nav-jornada"
          disabled={idx >= porJornada.length - 1}
          onClick={() => { if (idx < porJornada.length - 1) setJornadaSel(porJornada[idx + 1][0]); }}>›</button>
      </div>

      {fechasJornada.length > 0 && (
        <p className="calendario-fecha">
          {fechasJornada.length === 1
            ? fechaLarga(fechasJornada[0])
            : `${fechaCorta(fechasJornada[0])} — ${fechaCorta(fechasJornada[fechasJornada.length - 1])}`}
        </p>
      )}

      <div className="calendario-lista">
        {lista.map(p => {
          const [gl, gv] = p.jugado ? p.resultado.split('-').map(Number) : [null, null];
          const clicable = p.jugado && onVerPartido;
          return (
            <div className={`resultado-card ${clicable ? 'enlace-card' : ''}`} key={p.id}
              onClick={() => clicable && onVerPartido(p.id)}>
              <div className="resultado-grupo">
                {p.fecha ? fechaCorta(p.fecha) : `Jornada ${p.jornadaNum}`}
                {p.hora ? ` · ${p.hora}` : ''}
              </div>
              <div className={`resultado-linea ${p.jugado && gl > gv ? 'gana' : ''}`}>
                <span className="enlace" onClick={e => { e.stopPropagation(); equipoClicId(p.local.id); }}>
                  {p.local.nombre}
                </span>
                <span className="resultado-marca">{p.jugado ? gl : '·'}</span>
              </div>
              <div className={`resultado-linea ${p.jugado && gv > gl ? 'gana' : ''}`}>
                <span className="enlace" onClick={e => { e.stopPropagation(); equipoClicId(p.visitante.id); }}>
                  {p.visitante.nombre}
                </span>
                <span className="resultado-marca">{p.jugado ? gv : '·'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
