import { useMemo, useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

const COLOR = { local: '#e8622c', visitante: '#16233a' };

export default function Partido({ partido, equipos, competicion, temporada, onVolver, onVerEquipo, onVerJugador }) {
  const [gl, gv] = partido.resultado.split('-').map(Number);
  const cuartos = partido.cuartos || [];

  // Carga diferida del contexto por cuarto de este partido (fichero por competicion,
  // solo se descarga al abrir una ficha de partido). Robusto si aun no existe.
  const [ctxPartido, setCtxPartido] = useState(null);
  useEffect(() => {
    let vivo = true;
    const url = `${import.meta.env.BASE_URL}data/${competicion}/${temporada}/partidos-contexto.json`;
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (vivo) setCtxPartido(data ? (data[partido.id] || null) : null); })
      .catch(() => { if (vivo) setCtxPartido(null); });
    return () => { vivo = false; };
  }, [competicion, temporada, partido.id]);

  const [cuartosSel, setCuartosSel] = useState([0, 1, 2, 3]);
  const CAMPOS_CTX = [
    ['contraataque', 'Contraataque'], ['pintura', 'Pintura'],
    ['segundaOportunidad', '2ª oportunidad'], ['trasPerdida', 'Tras pérdida'], ['banquillo', 'Banquillo'],
  ];
  const ctxSumado = useMemo(() => {
    const acc = {};
    CAMPOS_CTX.forEach(([c]) => { acc[c] = { local: 0, visitante: 0 }; });
    if (ctxPartido) cuartosSel.forEach(i => {
      const q = ctxPartido[i];
      if (!q) return;
      CAMPOS_CTX.forEach(([c]) => {
        if (q[c]) { acc[c].local += q[c].local || 0; acc[c].visitante += q[c].visitante || 0; }
      });
    });
    return acc;
  }, [ctxPartido, cuartosSel]);

  const evolucion = useMemo(() => {
    let al = 0, av = 0;
    return cuartos.map(c => {
      al += c.local; av += c.visitante;
      return { periodo: c.periodo.replace('º C', 'Q').replace(' ', ''), local: al, visitante: av };
    });
  }, [cuartos]);

  // Cuarto decisivo: el de mayor diferencia de parcial (swing). Puro dato, sin
  // interpretar: señala dónde un equipo saco mas ventaja. Si hay empate, el ultimo.
  const cuartoDecisivo = useMemo(() => {
    let idx = -1, maxSwing = -1;
    cuartos.forEach((c, i) => {
      const swing = Math.abs(c.local - c.visitante);
      if (swing >= maxSwing) { maxSwing = swing; idx = i; }
    });
    return { idx, swing: maxSwing };
  }, [cuartos]);

  const enlaceEquipo = eq => {
    const e = equipos.find(x => x.id === eq.id);
    return e
      ? <span className="enlace" onClick={() => onVerEquipo(e)}>{eq.nombre}</span>
      : eq.nombre;
  };

  const total = (box, fn) => box.reduce((a, j) => a + fn(j), 0);

  const tablaBox = (box, nombre) => {
    const t = {
      pt: total(box, j => j.pt),
      t2a: total(box, j => j.t2.a), t2i: total(box, j => j.t2.i),
      t3a: total(box, j => j.t3.a), t3i: total(box, j => j.t3.i),
      tla: total(box, j => j.tl.a), tli: total(box, j => j.tl.i),
      ro: total(box, j => j.ro), rd: total(box, j => j.rd), rt: total(box, j => j.rt),
      as: total(box, j => j.as), br: total(box, j => j.br), bp: total(box, j => j.bp),
      tf: total(box, j => j.tf), tco: total(box, j => j.tco),
      fc: total(box, j => j.fc), fr: total(box, j => j.fr), va: total(box, j => j.va)
    };
    return (
      <>
        <h3 className="seccion">{nombre}</h3>
        <div className="tabla-scroll tabla-una-fija">
          <table>
            <thead>
              <tr>
                <th className="izq">Jugador</th><th>MIN</th><th>PTS</th>
                <th>T2</th><th>T3</th><th>TL</th>
                <th>RO</th><th>RD</th><th>REB</th><th>AST</th>
                <th>ROB</th><th>BP</th><th>TAP</th><th>TR</th>
                <th>FC</th><th>FR</th><th>VAL</th>
              </tr>
            </thead>
            <tbody>
              {box.map(j => (
                <tr key={j.nombre}>
                  <td className="izq">
                    {j.idJugador
                      ? <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                      : j.nombre}
                  </td>
                  <td>{Math.round(j.seg / 60)}</td>
                  <td>{j.pt}</td>
                  <td>{j.t2.a}/{j.t2.i}</td>
                  <td>{j.t3.a}/{j.t3.i}</td>
                  <td>{j.tl.a}/{j.tl.i}</td>
                  <td>{j.ro}</td><td>{j.rd}</td><td>{j.rt}</td><td>{j.as}</td>
                  <td>{j.br}</td><td>{j.bp}</td><td>{j.tf}</td><td>{j.tco}</td>
                  <td>{j.fc}</td><td>{j.fr}</td><td>{j.va}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fila-total">
                <td className="izq">TOTAL</td>
                <td>—</td>
                <td>{t.pt}</td>
                <td>{t.t2a}/{t.t2i}</td>
                <td>{t.t3a}/{t.t3i}</td>
                <td>{t.tla}/{t.tli}</td>
                <td>{t.ro}</td><td>{t.rd}</td><td>{t.rt}</td><td>{t.as}</td>
                <td>{t.br}</td><td>{t.bp}</td><td>{t.tf}</td><td>{t.tco}</td>
                <td>{t.fc}</td><td>{t.fr}</td><td>{t.va}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </>
    );
  };

  return (
    <div>
      <button className="boton-mas" onClick={onVolver}>← Volver</button>

      <div className="partido-marcador">
        <div className="partido-grupo">{partido.grupo} · {partido.jornada}</div>
        <div className="partido-equipos">
          <div className={`partido-equipo ${gl > gv ? 'gana' : ''}`}>
            <span className="partido-nombre">{enlaceEquipo(partido.local)}</span>
            <span className="partido-tanteo">{gl}</span>
          </div>
          <div className={`partido-equipo ${gv > gl ? 'gana' : ''}`}>
            <span className="partido-nombre">{enlaceEquipo(partido.visitante)}</span>
            <span className="partido-tanteo">{gv}</span>
          </div>
        </div>
      </div>

      {partido.boxscoreIncompleto && (
        <p className="aviso-dato">
          <strong>Estadística individual incompleta.</strong> La FEB no publicó todas las fichas
          de jugador de este partido. El marcador que ves es el que suma el acta por cuartos
          ({partido.resultado}); las fichas publicadas solo suman {partido.resultadoFeb}, así que
          faltan jugadores y la tabla de abajo no cuadra con el resultado final. No es un error de
          cálculo: el dato no existe en el origen.
        </p>
      )}

      {cuartos.length > 0 && (
        <>
          <h3 className="seccion">Marcador por cuartos</h3>
          <div className="tabla-scroll tabla-una-fija">
            <table>
              <thead>
                <tr>
                  <th className="izq">Equipo</th>
                  {cuartos.map((c, i) => <th key={i} style={i === cuartoDecisivo.idx ? { background: '#fbe9e1' } : null}>{c.periodo}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="izq">{partido.local.nombre}</td>
                  {cuartos.map((c, i) => <td key={i} style={i === cuartoDecisivo.idx ? { background: '#fbe9e1' } : null}>{c.local}</td>)}
                  <td style={{ fontWeight: 600 }}>{gl}</td>
                </tr>
                <tr>
                  <td className="izq">{partido.visitante.nombre}</td>
                  {cuartos.map((c, i) => <td key={i} style={i === cuartoDecisivo.idx ? { background: '#fbe9e1' } : null}>{c.visitante}</td>)}
                  <td style={{ fontWeight: 600 }}>{gv}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pie" style={{ marginTop: 4 }}>
            Se resalta el cuarto con mayor diferencia de parcial: el tramo donde un equipo sacó más ventaja.
          </p>

          <div className="panel-grafico">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucion} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend formatter={v => v === 'local' ? partido.local.nombre : partido.visitante.nombre} />
                <Line type="monotone" dataKey="local" stroke={COLOR.local} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="visitante" stroke={COLOR.visitante} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="pie" style={{ marginTop: 4 }}>Marcador acumulado al final de cada periodo.</p>
          </div>

          {ctxPartido && (
            <>
              <h3 className="seccion" style={{ marginTop: 18 }}>Contexto por cuarto</h3>
              <div className="grupos" style={{ marginTop: 4 }}>
                {[0, 1, 2, 3].map(i => {
                  const activo = cuartosSel.includes(i);
                  return (
                    <button key={i} className={`boton-grupo ${activo ? 'activo' : ''}`}
                      onClick={() => setCuartosSel(activo
                        ? (cuartosSel.length > 1 ? cuartosSel.filter(x => x !== i) : cuartosSel)
                        : [...cuartosSel, i].sort())}>
                      {`Q${i + 1}`}
                    </button>
                  );
                })}
                <button className={`boton-grupo ${cuartosSel.length === 4 ? 'activo' : ''}`}
                  onClick={() => setCuartosSel([0, 1, 2, 3])}>Todos</button>
              </div>
              <div className="tabla-scroll tabla-una-fija" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th className="izq">Puntos de…</th>
                      <th>{partido.local.nombre}</th>
                      <th>{partido.visitante.nombre}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAMPOS_CTX.map(([clave, etiqueta]) => (
                      <tr key={clave}>
                        <td className="izq">{etiqueta}</td>
                        <td>{ctxSumado[clave].local}</td>
                        <td>{ctxSumado[clave].visitante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="pie" style={{ marginTop: 4 }}>
                Puntos de cada tipo en los cuartos seleccionados: contraataque, en la pintura, de segunda
                oportunidad, tras pérdida del rival y desde el banquillo.
              </p>
            </>
          )}
        </>
      )}

      {partido.boxscore && partido.boxscore.local && (
        <>
          {tablaBox(partido.boxscore.local, partido.local.nombre)}
          {tablaBox(partido.boxscore.visitante, partido.visitante.nombre)}
        </>
      )}
    </div>
  );
}
