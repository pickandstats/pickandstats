import { useEffect, useMemo, useState } from 'react';

// El calendario es de la temporada que viene, así que no depende del selector
// de temporada de la app (que solo ofrece las ya jugadas).
const TEMPORADA = '2026';

const etiquetaTemporada = t => `${t}/${(+t + 1).toString().slice(2)}`;

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

export default function Calendario({ competicion, competicionNombre, onVerEquipoNombre }) {
  const [datos, setDatos] = useState(undefined);   // undefined = cargando, null = no hay
  const [grupo, setGrupo] = useState(null);
  const [jornadaSel, setJornadaSel] = useState(null);

  useEffect(() => {
    setDatos(undefined); setGrupo(null); setJornadaSel(null);
    fetch(`${import.meta.env.BASE_URL}data/${competicion}/${TEMPORADA}/calendario.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(setDatos)
      .catch(() => setDatos(null));
  }, [competicion]);

  const partidos = datos?.partidos || [];

  const grupos = useMemo(
    () => [...new Set(partidos.map(p => p.grupo))].sort(),
    [partidos]
  );

  useEffect(() => {
    if (grupos.length && !grupos.includes(grupo)) setGrupo(grupos[0]);
  }, [grupos, grupo]);

  const porJornada = useMemo(() => {
    const m = new Map();
    partidos.filter(p => p.grupo === grupo).forEach(p => {
      if (!m.has(p.jornada)) m.set(p.jornada, []);
      m.get(p.jornada).push(p);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [partidos, grupo]);

  // Por defecto, la primera jornada que aún no se ha jugado
  const jornadaPorDefecto = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const proxima = porJornada.find(([, lista]) => lista.some(p => p.fecha >= hoy));
    return proxima ? proxima[0] : (porJornada[0]?.[0] ?? null);
  }, [porJornada]);

  const jornadaActiva = jornadaSel ?? jornadaPorDefecto;
  const lista = porJornada.find(([n]) => n === jornadaActiva)?.[1] || [];

  if (datos === undefined) return <p className="cargando">Cargando calendario…</p>;

  if (datos === null) {
    return (
      <div>
        <h3 className="seccion">Calendario {etiquetaTemporada(TEMPORADA)}</h3>
        <p className="aviso-dato">
          Todavía no hay calendario publicado para {competicionNombre} en la temporada{' '}
          {etiquetaTemporada(TEMPORADA)}. En cuanto la FEB lo publique aparecerá aquí.
        </p>
      </div>
    );
  }

  const equipoClic = nombre =>
    onVerEquipoNombre
      ? <span className="enlace" onClick={() => onVerEquipoNombre(nombre)}>{nombre}</span>
      : nombre;

  const fechasJornada = [...new Set(lista.map(p => p.fecha))].sort();

  return (
    <div>
      <h3 className="seccion">
        Calendario {etiquetaTemporada(TEMPORADA)} · {competicionNombre}
      </h3>

      {grupos.length > 1 && (
        <div className="grupos">
          {grupos.map(g => (
            <button key={g} className={`boton-grupo ${g === grupo ? 'activo' : ''}`}
              onClick={() => { setGrupo(g); setJornadaSel(null); }}>
              Grupo {g}
            </button>
          ))}
        </div>
      )}

      <div className="grupos calendario-jornadas">
        {porJornada.map(([n]) => (
          <button key={n} className={`boton-grupo ${n === jornadaActiva ? 'activo' : ''}`}
            onClick={() => setJornadaSel(n)}>
            J{n}
          </button>
        ))}
      </div>

      {fechasJornada.length > 0 && (
        <p className="calendario-fecha">
          {fechasJornada.length === 1
            ? fechaLarga(fechasJornada[0])
            : `${fechaCorta(fechasJornada[0])} — ${fechaCorta(fechasJornada[fechasJornada.length - 1])}`}
        </p>
      )}

      <div className="calendario-lista">
        {lista.map((p, i) => {
          const jugado = p.resultado && /\d/.test(p.resultado);
          const [gl, gv] = jugado ? p.resultado.split('-').map(Number) : [null, null];
          return (
            <div className="resultado-card" key={i}>
              <div className="resultado-grupo">
                {fechaCorta(p.fecha)}{p.hora ? ` · ${p.hora}` : ''}
              </div>
              <div className={`resultado-linea ${jugado && gl > gv ? 'gana' : ''}`}>
                <span>{equipoClic(p.local)}</span>
                <span className="resultado-marca">{jugado ? gl : '·'}</span>
              </div>
              <div className={`resultado-linea ${jugado && gv > gl ? 'gana' : ''}`}>
                <span>{equipoClic(p.visitante)}</span>
                <span className="resultado-marca">{jugado ? gv : '·'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="pie" style={{ marginTop: 12 }}>
        {datos.nota || ''} Fuente: {datos.fuente || 'FEB'}.
      </p>
    </div>
  );
}
