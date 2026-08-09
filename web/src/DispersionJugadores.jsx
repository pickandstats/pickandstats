import { useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';

const COLOR = { tinta: '#16233a', acento: '#e8622c', suave: '#9aa1ac' };

// Métricas que tienen sentido cruzar. Cada una con su lectura.
const METRICAS = [
  { clave: 'usg',           titulo: 'USG% (uso)',        ayuda: 'posesiones que termina' },
  { clave: 'ts',            titulo: 'TS% (eficiencia)',  ayuda: 'eficiencia real de tiro' },
  { clave: 'efg',           titulo: 'eFG%',              ayuda: 'tiro de campo efectivo' },
  { clave: 'ptPorPartido',  titulo: 'Puntos',            ayuda: 'puntos por partido' },
  { clave: 'rtPorPartido',  titulo: 'Rebotes',           ayuda: 'rebotes por partido' },
  { clave: 'asPorPartido',  titulo: 'Asistencias',       ayuda: 'asistencias por partido' },
  { clave: 'vaPorPartido',  titulo: 'Valoración',        ayuda: 'valoración por partido' },
  { clave: 'minPorPartido', titulo: 'Minutos',           ayuda: 'minutos por partido' },
];

const apellido = n => String(n).split(',')[0].trim();

export default function DispersionJugadores({ jugadores, onVerJugador }) {
  const [ejeX, setEjeX] = useState('usg');
  const [ejeY, setEjeY] = useState('ts');

  const datos = useMemo(() => jugadores
    .filter(j => Number.isFinite(+j[ejeX]) && Number.isFinite(+j[ejeY]))
    .map(j => ({
      x: +j[ejeX], y: +j[ejeY],
      min: +j.minPorPartido || 0,
      nombre: j.nombre, equipo: j.equipo, pj: j.pj,
      id: j.idJugador,
    })), [jugadores, ejeX, ejeY]);

  const medias = useMemo(() => {
    if (!datos.length) return { x: 0, y: 0 };
    return {
      x: datos.reduce((a, d) => a + d.x, 0) / datos.length,
      y: datos.reduce((a, d) => a + d.y, 0) / datos.length,
    };
  }, [datos]);

  // Con cientos de jugadores la nube se satura: puntos más pequeños y
  // translúcidos dejan ver la densidad en vez de una mancha uniforme.
  const muchos = datos.length > 400;
  const rango = muchos ? [10, 90] : datos.length > 150 ? [16, 150] : [25, 260];
  const opacidadAlta = muchos ? 0.5 : 0.75;
  const opacidadBaja = muchos ? 0.28 : 0.42;

  const tX = METRICAS.find(m => m.clave === ejeX) || METRICAS[0];
  const tY = METRICAS.find(m => m.clave === ejeY) || METRICAS[1];

  if (!datos.length) {
    return <p className="cargando">No hay jugadores que cumplan los filtros actuales.</p>;
  }

  return (
    <>
      <div className="filtros" style={{ marginTop: 4 }}>
        <label>
          Eje horizontal{' '}
          <select value={ejeX} onChange={e => setEjeX(e.target.value)}>
            {METRICAS.map(m => <option key={m.clave} value={m.clave}>{m.titulo}</option>)}
          </select>
        </label>
        <label>
          Eje vertical{' '}
          <select value={ejeY} onChange={e => setEjeY(e.target.value)}>
            {METRICAS.map(m => <option key={m.clave} value={m.clave}>{m.titulo}</option>)}
          </select>
        </label>
        <span className="dispersion-n">{datos.length} jugadores</span>
      </div>

      <div className="panel-grafico">
        <ResponsiveContainer width="100%" height={440}>
          <ScatterChart margin={{ top: 12, right: 20, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
            <XAxis type="number" dataKey="x" name={tX.titulo}
              domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }}
              label={{ value: tX.titulo, position: 'insideBottom', offset: -8, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" name={tY.titulo}
              domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }}
              label={{ value: tY.titulo, angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <ZAxis type="number" dataKey="min" range={rango} name="Minutos" />
            <ReferenceLine x={medias.x} stroke={COLOR.suave} strokeDasharray="4 4" />
            <ReferenceLine y={medias.y} stroke={COLOR.suave} strokeDasharray="4 4" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="tooltip-dispersion">
                    <strong>{d.nombre}</strong>
                    <div>{d.equipo} · {d.pj} partidos · {d.min.toFixed(1)} min</div>
                    <div>{tX.titulo}: {d.x.toFixed(1)}</div>
                    <div>{tY.titulo}: {d.y.toFixed(1)}</div>
                  </div>
                );
              }} />
            <Scatter data={datos} onClick={p => onVerJugador && onVerJugador(p.id)}>
              {datos.map((d, i) => (
                <Cell key={i}
                  fill={d.x >= medias.x && d.y >= medias.y ? COLOR.acento : COLOR.tinta}
                  fillOpacity={d.x >= medias.x && d.y >= medias.y ? opacidadAlta : opacidadBaja}
                  stroke="none" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="leyenda-dispersion">
          <div className="ld-fila">
            <span className="ld-marca ld-punto-grande" />
            <span><strong>Cada punto es un jugador.</strong> Su tamaño indica los minutos
            que juega por partido: los grandes son titulares; los pequeños, rotación corta.</span>
          </div>
          <div className="ld-fila">
            <span className="ld-marca ld-linea" />
            <span><strong>Las líneas discontinuas</strong> marcan la media de los jugadores
            que estás viendo, no de toda la categoría. Si cambias los filtros, se mueven.</span>
          </div>
          <div className="ld-fila">
            <span className="ld-marca ld-punto-naranja" />
            <span><strong>En naranja</strong>, quienes superan las dos medias a la vez.
            En azul, el resto.</span>
          </div>

          <p className="ld-cuadrantes">
            Las dos líneas dividen el gráfico en cuatro zonas. Con
            <strong> {tX.titulo}</strong> en horizontal y <strong>{tY.titulo}</strong> en
            vertical, se leen así:
          </p>
          <div className="ld-rejilla">
            <div><span className="ld-esquina">Arriba izquierda</span>
              Poco {tX.ayuda}, mucho {tY.ayuda}.</div>
            <div><span className="ld-esquina">Arriba derecha</span>
              Mucho de ambas cosas.</div>
            <div><span className="ld-esquina">Abajo izquierda</span>
              Poco de ambas cosas.</div>
            <div><span className="ld-esquina">Abajo derecha</span>
              Mucho {tX.ayuda}, poco {tY.ayuda}.</div>
          </div>

          {ejeX === 'usg' && ejeY === 'ts' && (
            <p className="ld-nota">
              Este cruce es el más revelador: enfrenta cuánta responsabilidad ofensiva
              asume un jugador con la eficiencia que consigue. Arriba a la derecha están
              los que tiran mucho y además aciertan, que es el perfil más valioso. Abajo a
              la derecha, los que asumen tiros sin rentabilizarlos. Y arriba a la
              izquierda aparecen especialistas eficientes con poco protagonismo: a veces,
              jugadores infrautilizados.
            </p>
          )}

          <p className="ld-nota">
            Un jugador con pocos partidos puede aparecer en posiciones extremas sin que
            eso describa su nivel. Ajusta el mínimo de partidos si quieres una lectura más
            estable. Pulsa cualquier punto para abrir su ficha.
          </p>
        </div>
      </div>
    </>
  );
}
