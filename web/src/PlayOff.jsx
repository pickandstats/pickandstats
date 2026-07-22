import { useMemo } from 'react';

const clavePar = (a, b) => [a, b].sort().join(' ||| ');

const aFecha = str => {
  const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
};

// El cuadro de Segunda tiene semántica propia: el duelo de campeones abre
// (su perdedor cae a cuartos) y no hay final (ascienden los dos semifinalistas).
function tipoRonda(nombre, modo) {
  const segunda = modo === 'global';
  if (/permanencia/i.test(nombre))
    return { orden: 6, titulo: 'Permanencia', nota: 'El perdedor desciende a Tercera FEB.' };
  if (segunda && /1º/.test(nombre))
    return { orden: 1, titulo: 'Duelo de campeones · 1º Este – 1º Oeste', ascenso: true,
             nota: 'El ganador asciende a Primera FEB. El perdedor no queda eliminado: entra en cuartos de final.' };
  if (/1\/8/.test(nombre)) return { orden: 2, titulo: 'Octavos de final' };
  if (/1\/4/.test(nombre)) return { orden: 3, titulo: 'Cuartos de final',
    nota: segunda ? 'Los 7 ganadores de octavos más el perdedor del duelo de campeones.' : null };
  if (/1\/2/.test(nombre)) return { orden: 4, titulo: 'Semifinales',
    ascenso: segunda,
    nota: segunda ? 'No se disputa final: los ganadores de ambas semifinales ascienden a Primera FEB.' : null };
  if (/final/i.test(nombre)) return { orden: 5, titulo: 'Final' };
  return { orden: 9, titulo: nombre };
}

// modo: 'victorias' (best-of-N, Primera) | 'global' (agregado a doble partido, Segunda)
export default function PlayOff({ fases, modo = 'victorias', onVerEquipoNombre, onVerPartido }) {
  const rondas = useMemo(() => {
    return fases.map(f => {
      const info = tipoRonda(f.fase, modo);
      const series = {};
      for (const p of f.partidos) {
        const k = clavePar(p.local, p.visitante);
        if (!series[k]) series[k] = { equipos: new Set(), partidos: [], vict: {}, glob: {} };
        series[k].equipos.add(p.local);
        series[k].equipos.add(p.visitante);
        series[k].partidos.push(p);
        if (p.resultado) {
          const [gl, gv] = p.resultado.split('-').map(Number);
          const ganaP = gl > gv ? p.local : p.visitante;
          series[k].vict[ganaP] = (series[k].vict[ganaP] || 0) + 1;
          series[k].glob[p.local] = (series[k].glob[p.local] || 0) + gl;
          series[k].glob[p.visitante] = (series[k].glob[p.visitante] || 0) + gv;
        }
      }
      const listaSeries = Object.values(series).map(s => {
        const eqs = [...s.equipos];
        s.partidos.sort((a, b) => aFecha(a.fecha) - aFecha(b.fecha));
        const esSerie = s.partidos.length > 1;
        // En modo global la eliminatoria solo está resuelta con la vuelta jugada
        const completa = modo === 'global' ? s.partidos.every(p => p.resultado) : true;
        let ganador = null, marcador = ['', ''];
        if (eqs.length === 2) {
          const tabla = modo === 'global' ? s.glob : s.vict;
          const m0 = tabla[eqs[0]] || 0, m1 = tabla[eqs[1]] || 0;
          marcador = [m0, m1];
          if (m0 !== m1 && completa) ganador = m0 > m1 ? eqs[0] : eqs[1];
        }
        return { equipos: eqs, partidos: s.partidos, esSerie, ganador, marcador };
      });
      return { ...info, fase: f.fase, series: listaSeries };
    }).sort((a, b) => a.orden - b.orden);
  }, [fases, modo]);

  const nombreClic = nombre => (
    <span className="enlace" onClick={() => onVerEquipoNombre(nombre)}>{nombre}</span>
  );

  const abrirPartido = (p, titulo) => {
    if (!p.boxscore) return;
    onVerPartido({
      ...p, grupo: 'Play-offs', jornada: titulo,
      local: { id: null, nombre: p.local },
      visitante: { id: null, nombre: p.visitante },
      cuartos: p.cuartos || []
    });
  };

  const equipo = (nombre, s, r) => (
    <span className={`serie-equipo ${s.ganador === nombre ? 'gana' : ''}`}>
      {nombreClic(nombre)}
      {r.ascenso && s.ganador === nombre && <em className="badge-ascenso">ASCENSO</em>}
    </span>
  );

  return (
    <div className="playoff">
      {rondas.map(r => (
        <div className="playoff-ronda" key={r.fase}>
          <h3 className="seccion">{r.titulo}</h3>
          {r.nota && <p className="pie">{r.nota}</p>}
          {modo === 'global' && (
            <p className="pie">Eliminatoria a doble partido: pasa el mejor global (ida + vuelta).</p>
          )}
          <div className="playoff-series">
            {r.series.map((s, i) => (
              <div className="playoff-serie" key={i}>
                {s.esSerie ? (
                  <>
                    <div className="serie-cabecera">
                      {equipo(s.equipos[0], s, r)}
                      <span className="serie-marcador">{s.marcador[0]}–{s.marcador[1]}</span>
                      {equipo(s.equipos[1], s, r)}
                    </div>
                    <div className="serie-partidos">
                      {s.partidos.map(p => {
                        const [gl, gv] = (p.resultado || '').split('-').map(Number);
                        const jugado = !isNaN(gl) && !isNaN(gv);
                        return (
                          <div className="serie-partido enlace-card" key={p.id}
                            onClick={() => jugado && abrirPartido(p, r.titulo)}>
                            <span className="serie-fecha">{p.fecha}</span>
                            <span className={jugado && gl > gv ? 'gana' : ''}>{p.local}</span>
                            <span className="resultado-marca">{jugado ? `${gl}–${gv}` : 'vs'}</span>
                            <span className={jugado && gv > gl ? 'gana' : ''}>{p.visitante}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  s.partidos.map(p => {
                    const [gl, gv] = (p.resultado || '').split('-').map(Number);
                    const jugado = !isNaN(gl) && !isNaN(gv);
                    return (
                      <div className="playoff-unico enlace-card" key={p.id}
                        onClick={() => jugado && abrirPartido(p, r.titulo)}>
                        <span className="serie-fecha">{p.fecha}</span>
                        <div className={`serie-equipo ${jugado && gl > gv ? 'gana' : ''}`}>{nombreClic(p.local)}</div>
                        <span className="serie-marcador">{jugado ? `${gl}–${gv}` : 'vs'}</span>
                        <div className={`serie-equipo ${jugado && gv > gl ? 'gana' : ''}`}>{nombreClic(p.visitante)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
