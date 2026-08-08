import { useMemo, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';

const COLOR = { propio: '#e8622c', rival: '#16233a' };

// Ejes del radar: los percentiles que describen mejor un perfil completo
const EJES = [
  { clave: 'ptPorPartido', titulo: 'Puntos' },
  { clave: 'rtPorPartido', titulo: 'Rebotes' },
  { clave: 'asPorPartido', titulo: 'Asistencias' },
  { clave: 'brPorPartido', titulo: 'Robos' },
  { clave: 'ts', titulo: 'Eficiencia (TS%)' },
  { clave: 't3Pct', titulo: 'Triple' },
];

const apellido = n => String(n).split(',')[0].trim();

export default function RadarJugador({ carrera, jugadores, referencia = 'nac' }) {
  const [rivalId, setRivalId] = useState('');
  const [ref, setRef] = useState(referencia);

  const pct = carrera.percentiles;

  // Solo tienen sentido como comparables los que tienen percentiles calculados
  const comparables = useMemo(() => {
    if (!jugadores) return [];
    return jugadores
      .filter(j => j.percentiles && String(j.idJugador) !== String(carrera.idJugador))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [jugadores, carrera.idJugador]);

  const rival = comparables.find(j => String(j.idJugador) === rivalId) || null;

  const datos = useMemo(() => {
    if (!pct) return [];
    return EJES.map(e => {
      const p = pct[e.clave];
      const fila = { eje: e.titulo, propio: p ? p[ref] : 0 };
      if (rival && rival.percentiles && rival.percentiles[e.clave])
        fila.rival = rival.percentiles[e.clave][ref];
      return fila;
    });
  }, [pct, rival, ref]);

  if (!pct) return null;

  return (
    <>
      <h3 className="seccion">Perfil comparado</h3>

      <div className="grupos" style={{ marginBottom: 8 }}>
        <select className="selector-rival" value={rivalId}
          onChange={e => setRivalId(e.target.value)}>
          <option value="">Comparar con…</option>
          {comparables.map(j => (
            <option key={j.idJugador} value={j.idJugador}>
              {j.nombre} · {j.equipo}
            </option>
          ))}
        </select>
        <span className="separador" />
        <button className={`boton-grupo ${ref === 'nac' ? 'activo' : ''}`}
          onClick={() => setRef('nac')}>Nacional</button>
        <button className={`boton-grupo ${ref === 'grp' ? 'activo' : ''}`}
          onClick={() => setRef('grp')}>Su grupo</button>
      </div>

      <div className="panel-grafico">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={datos} outerRadius="72%">
            <PolarGrid stroke="#e3e6eb" />
            <PolarAngleAxis dataKey="eje" tick={{ fontSize: 12, fill: '#5b6472' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
            <Tooltip formatter={(v, n) => [
              `percentil ${v}`,
              n === 'propio' ? apellido(carrera.nombre) : (rival ? apellido(rival.nombre) : '')
            ]} />
            <Legend formatter={v =>
              v === 'propio' ? apellido(carrera.nombre) : (rival ? apellido(rival.nombre) : '')} />
            <Radar name="propio" dataKey="propio" stroke={COLOR.propio}
              fill={COLOR.propio} fillOpacity={0.32} strokeWidth={2} />
            {rival && (
              <Radar name="rival" dataKey="rival" stroke={COLOR.rival}
                fill={COLOR.rival} fillOpacity={0.18} strokeWidth={2} />
            )}
          </RadarChart>
        </ResponsiveContainer>
        <p className="pie" style={{ marginTop: 4 }}>
          Cada eje es un percentil: 100 es el mejor de la {ref === 'nac' ? 'categoría' : 'grupo'}.
          Un perfil muy irregular no es peor que uno redondo, describe a un jugador
          especializado. Solo aparecen jugadores con partidos suficientes para tener
          percentiles.
        </p>
      </div>
    </>
  );
}
