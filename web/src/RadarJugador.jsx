import { useMemo, useState } from 'react';
import { tieneIntentosSuficientesTS, SUELO_INTENTOS_TS_POR_PARTIDO } from './volumen';
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
    // El eje de TS% sigue en su sitio aunque el jugador no tenga intentos
    // suficientes (ver volumen.js): se queda SIN punto (null), no en 0 -- un 0
    // dibujaria un percentil que no existe y un eje menos desplazaria a los
    // demas. Cada serie decide por separado: el rival puede tenerlo y el
    // propio no.
    const propioSinTS = !tieneIntentosSuficientesTS(carrera);
    const rivalSinTS = rival ? !tieneIntentosSuficientesTS(rival) : false;
    const hayRecorte = propioSinTS || rivalSinTS;
    return EJES.map(e => {
      const p = pct[e.clave];
      const sinVolumen = e.clave === 'ts';
      // Recharts dibuja el vertice sin valor en el centro, igual que un
      // percentil 0: el eje lleva un asterisco y la nota de debajo dice por
      // que no hay punto.
      const fila = { eje: e.titulo + (sinVolumen && hayRecorte ? ' *' : ''), propio: p && !(sinVolumen && propioSinTS) ? p[ref] : (p ? null : 0) };
      if (rival && rival.percentiles && rival.percentiles[e.clave])
        fila.rival = sinVolumen && rivalSinTS ? null : rival.percentiles[e.clave][ref];
      return fila;
    });
  }, [pct, rival, ref, carrera]);

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
        {(!tieneIntentosSuficientesTS(carrera) || (rival && !tieneIntentosSuficientesTS(rival))) && (
          <p className="pie" style={{ marginTop: 4 }}>
            * Eficiencia (TS%) sin punto para {[
              !tieneIntentosSuficientesTS(carrera) && apellido(carrera.nombre),
              rival && !tieneIntentosSuficientesTS(rival) && apellido(rival.nombre),
            ].filter(Boolean).join(' y ')}: menos de {SUELO_INTENTOS_TS_POR_PARTIDO} intentos de tiro
            ponderados por partido. El vértice se dibuja en el centro, pero no es un percentil 0.
          </p>
        )}
      </div>
    </>
  );
}
