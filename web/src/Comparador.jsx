import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

// dir: 1 = más es mejor, -1 = menos es mejor, 0 = neutro
const METRICAS = [
  { clave: 'pg',      titulo: 'Victorias',              dir: 1 },
  { clave: 'pace',    titulo: 'Pace (posesiones/partido)', dir: 0 },
  { clave: 'ortg',    titulo: 'Rating ofensivo',        dir: 1 },
  { clave: 'drtg',    titulo: 'Rating defensivo',       dir: -1 },
  { clave: 'netrtg',  titulo: 'Net Rating',             dir: 1 },
  { clave: 'efg',     titulo: 'eFG% (tiro efectivo)',   dir: 1 },
  { clave: 'tovPct',  titulo: 'TOV% (pérdidas)',        dir: -1 },
  { clave: 'orbPct',  titulo: 'ORB% (rebote ofensivo)', dir: 1 },
  { clave: 'ftRate',  titulo: 'FTr (tiros libres)',     dir: 1 },
  { clave: 't3Pct',   titulo: 'T3%',                    dir: 1 },
  { clave: 'asPorBp', titulo: 'Asistencias por pérdida', dir: 1 },
];

const COLOR = { a: '#e8622c', b: '#16233a' };

export default function Comparador({ equipos, grupos }) {
  const ordenados = useMemo(() =>
    [...equipos].sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nombre.localeCompare(b.nombre)),
    [equipos]);

  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  const eqA = equipos.find(e => e.id === idA);
  const eqB = equipos.find(e => e.id === idB);

  const ganador = (m) => {
    if (!eqA || !eqB || m.dir === 0) return null;
    const va = eqA[m.clave], vb = eqB[m.clave];
    if (va === vb) return null;
    return (m.dir === 1 ? va > vb : va < vb) ? 'a' : 'b';
  };

  const fourFactors = eqA && eqB ? [
    { factor: 'eFG%', [eqA.nombre]: eqA.efg,    [eqB.nombre]: eqB.efg },
    { factor: 'TOV%', [eqA.nombre]: eqA.tovPct, [eqB.nombre]: eqB.tovPct },
    { factor: 'ORB%', [eqA.nombre]: eqA.orbPct, [eqB.nombre]: eqB.orbPct },
    { factor: 'FTr',  [eqA.nombre]: eqA.ftRate, [eqB.nombre]: eqB.ftRate },
  ] : [];

  const selector = (valor, setValor, excluir) => (
    <select value={valor} onChange={e => setValor(e.target.value)}>
      <option value="">— Elegir equipo —</option>
      {grupos.map(g => (
        <optgroup key={g} label={`Grupo ${g}`}>
          {ordenados.filter(e => e.grupo === g && e.id !== excluir).map(e => (
            <option key={e.id} value={e.id}>{e.nombre} ({e.pg}-{e.pp})</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <>
      <div className="filtros">
        {selector(idA, setIdA, idB)}
        <span className="vs">VS</span>
        {selector(idB, setIdB, idA)}
      </div>

      {!eqA || !eqB ? (
        <p className="cargando">Elige dos equipos para ver el cara a cara — pueden ser de grupos distintos.</p>
      ) : (
        <>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th className="izq col-a">{eqA.nombre} · {eqA.grupo}</th>
                  <th style={{ textAlign: 'center' }}>Métrica</th>
                  <th className="col-b">{eqB.nombre} · {eqB.grupo}</th>
                </tr>
              </thead>
              <tbody>
                {METRICAS.map(m => {
                  const g = ganador(m);
                  return (
                    <tr key={m.clave}>
                      <td className={`izq ${g === 'a' ? 'domina-a' : ''}`}>{eqA[m.clave]}</td>
                      <td className="metrica">{m.titulo}</td>
                      <td className={g === 'b' ? 'domina-b' : ''}>{eqB[m.clave]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="seccion">Four Factors enfrentados</h3>
          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fourFactors} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" vertical={false} />
                <XAxis dataKey="factor" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey={eqA.nombre} fill={COLOR.a} radius={[3, 3, 0, 0]} />
                <Bar dataKey={eqB.nombre} fill={COLOR.b} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="pie" style={{ marginTop: 4 }}>
              En TOV% (pérdidas), menos es mejor; en el resto, más es mejor.
            </p>
          </div>
        </>
      )}
    </>
  );
}
