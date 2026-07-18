import { useMemo, useState } from 'react';
import AnalisisEquipo from './AnalisisEquipo';

function nivelVs(valor, media, menosEsMejor = false, u1 = 0.06, u2 = 0.15) {
  if (!media) return 0;
  let d = (valor - media) / Math.abs(media);
  if (menosEsMejor) d = -d;
  if (d >= u2) return 2;
  if (d >= u1) return 1;
  if (d <= -u2) return -2;
  if (d <= -u1) return -1;
  return 0;
}

const etiquetaNivel = n =>
  n >= 2 ? 'muy fuerte' : n >= 1 ? 'fuerte' : n <= -2 ? 'muy flojo' : n <= -1 ? 'flojo' : 'normal';

export default function DossierPartido({ equipo, equipos, jugadores, onVerJugador }) {
  const [rivalId, setRivalId] = useState('');

  const rivales = useMemo(() =>
    equipos.filter(e => e.grupo === equipo.grupo && e.id !== equipo.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [equipos, equipo]);

  const rival = rivales.find(e => e.id === rivalId) || null;

  const jugadoresClave = useMemo(() => {
    if (!rival) return [];
    return jugadores
      .filter(j => j.equipoId === rival.id && j.pj >= 5)
      .sort((a, b) => b.vaPorPartido - a.vaPorPartido)
      .slice(0, 4);
  }, [jugadores, rival]);

  const duelo = useMemo(() => {
    if (!rival) return null;
    const delGrupo = equipos.filter(e => e.grupo === equipo.grupo);
    const media = clave => delGrupo.reduce((a, e) => a + e[clave], 0) / delGrupo.length;
    const m = {
      efg: media('efg'), tovPct: media('tovPct'), orbPct: media('orbPct'), ftRate: media('ftRate'),
      efgRival: media('efgRival'), tovForzadas: media('tovForzadas'),
      drbPct: media('drbPct'), ftrRival: media('ftrRival'), pace: media('pace'),
    };

    const facetasDe = (at, def) => ([
      {
        nombre: 'Acierto de tiro',
        detalle: `eFG% ${at.efg} vs defensa que permite ${def.efgRival}`,
        nAt: nivelVs(at.efg, m.efg),
        nDef: nivelVs(def.efgRival, m.efgRival, true),
      },
      {
        nombre: 'Cuidado del balón vs presión',
        detalle: `pierde ${at.tovPct}% vs defensa que fuerza ${def.tovForzadas}%`,
        nAt: nivelVs(at.tovPct, m.tovPct, true),
        nDef: nivelVs(def.tovForzadas, m.tovForzadas),
      },
      {
        nombre: 'Rebote ofensivo vs cierre',
        detalle: `ORB% ${at.orbPct} vs DRB% rival ${def.drbPct}`,
        nAt: nivelVs(at.orbPct, m.orbPct),
        nDef: nivelVs(def.drbPct, m.drbPct),
      },
      {
        nombre: 'Generar faltas vs disciplina',
        detalle: `FTr ${at.ftRate} vs rival que concede ${def.ftrRival}`,
        nAt: nivelVs(at.ftRate, m.ftRate),
        nDef: nivelVs(def.ftrRival, m.ftrRival, true),
      },
    ].map(f => ({ ...f, ventaja: f.nAt - f.nDef })));

    const ataqueA = facetasDe(equipo, rival);
    const ataqueB = facetasDe(rival, equipo);

    const claves = [];
    for (const f of ataqueA) {
      if (f.ventaja >= 2) claves.push(`${equipo.nombre} puede dominar en ${f.nombre.toLowerCase()}: ataque ${etiquetaNivel(f.nAt)} contra defensa ${etiquetaNivel(f.nDef)}.`);
      if (f.ventaja <= -2) claves.push(`${rival.nombre} puede frenar a ${equipo.nombre} en ${f.nombre.toLowerCase()}: defensa ${etiquetaNivel(f.nDef)} contra ataque ${etiquetaNivel(f.nAt)}.`);
    }
    for (const f of ataqueB) {
      if (f.ventaja >= 2) claves.push(`${rival.nombre} puede dominar en ${f.nombre.toLowerCase()}: ataque ${etiquetaNivel(f.nAt)} contra defensa ${etiquetaNivel(f.nDef)}.`);
      if (f.ventaja <= -2) claves.push(`${equipo.nombre} puede frenar a ${rival.nombre} en ${f.nombre.toLowerCase()}: defensa ${etiquetaNivel(f.nDef)} contra ataque ${etiquetaNivel(f.nAt)}.`);
    }
    if (!claves.length) claves.push('Duelo sin brechas claras entre estilos: partido abierto donde los detalles decidirán.');

    const difNet = equipo.netrtg - rival.netrtg;
    const pronostico = Math.abs(difNet) < 3
      ? 'Enfrentamiento muy igualado según el rendimiento global.'
      : `Ventaja global para ${difNet > 0 ? equipo.nombre : rival.nombre} (${Math.abs(difNet).toFixed(1)} pts de Net Rating).`;

    const paceA = nivelVs(equipo.pace, m.pace);
    const paceB = nivelVs(rival.pace, m.pace);
    let ritmo = 'Ritmos de juego similares.';
    if (paceA >= 1 && paceB <= -1) ritmo = `${equipo.nombre} querrá correr; ${rival.nombre} preferirá frenar. La lucha por el ritmo será clave.`;
    else if (paceB >= 1 && paceA <= -1) ritmo = `${rival.nombre} querrá un partido rápido; ${equipo.nombre} intentará ralentizarlo.`;
    else if (paceA >= 1 && paceB >= 1) ritmo = 'Ambos a ritmo alto: se espera partido de anotación.';
    else if (paceA <= -1 && paceB <= -1) ritmo = 'Ambos pausados: partido de pocas posesiones.';

    return { ataqueA, ataqueB, claves, pronostico, ritmo };
  }, [rival, equipo, equipos]);

  const flecha = v => v >= 2 ? '◀◀' : v >= 1 ? '◀' : v <= -2 ? '▶▶' : v <= -1 ? '▶' : '=';

  const tablaDuelo = (facetas, nombreAtaque, nombreDefensa) => (
    <div className="analisis-bloque">
      <div className="analisis-titulo">Ataque de {nombreAtaque} vs defensa de {nombreDefensa}</div>
      <table className="tabla-duelo">
        <tbody>
          {facetas.map(f => (
            <tr key={f.nombre}>
              <td className="duelo-faceta">
                <div>{f.nombre}</div>
                <div className="duelo-detalle">{f.detalle}</div>
              </td>
              <td className={`duelo-veredicto ${f.ventaja > 0 ? 'net-pos' : f.ventaja < 0 ? 'net-neg' : ''}`}>
                {f.ventaja > 0 ? `ventaja ${nombreAtaque}` : f.ventaja < 0 ? `ventaja ${nombreDefensa}` : 'equilibrado'}
                {' '}{flecha(f.ventaja)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Comparativa directa métrica a métrica
  const METRICAS_COMPARATIVA = [
    { clave: 'pfPartido', titulo: 'Puntos a favor / partido' },
    { clave: 'pcPartido', titulo: 'Puntos en contra / partido', menosEsMejor: true },
    { clave: 'pace', titulo: 'Pace (posesiones)' , neutra: true },
    { clave: 'ortg', titulo: 'Rating ofensivo' },
    { clave: 'drtg', titulo: 'Rating defensivo', menosEsMejor: true },
    { clave: 'netrtg', titulo: 'Net Rating' },
    { clave: 'efg', titulo: 'eFG%' },
    { clave: 'ts', titulo: 'TS%' },
    { clave: 'tovPct', titulo: 'Pérdidas %', menosEsMejor: true },
    { clave: 'orbPct', titulo: 'Rebote ofensivo %' },
    { clave: 'drbPct', titulo: 'Rebote defensivo %' },
    { clave: 'efgRival', titulo: 'eFG% permitido', menosEsMejor: true },
    { clave: 'tovForzadas', titulo: 'Pérdidas forzadas %' },
    { clave: 'forma5', titulo: 'Últimos 5', texto: true },
  ];

  return (
    <div className="dossier">
      <div className="filtros">
        <label>
          Preparar partido contra{' '}
          <select value={rivalId} onChange={e => setRivalId(e.target.value)}>
            <option value="">— Elige rival de su grupo —</option>
            {rivales.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
      </div>

      {rival && duelo && (
        <>
          {/* Cabecera del duelo */}
          <div className="duelo-cabecera">
            <div className="duelo-equipo">
              <div className="duelo-nombre">{equipo.nombre}</div>
              <div className="duelo-record">{equipo.pg}-{equipo.pp} · Net {equipo.netrtg > 0 ? '+' : ''}{equipo.netrtg} · Últ.5 {equipo.forma5}</div>
            </div>
            <div className="duelo-vs">VS</div>
            <div className="duelo-equipo">
              <div className="duelo-nombre">{rival.nombre}</div>
              <div className="duelo-record">{rival.pg}-{rival.pp} · Net {rival.netrtg > 0 ? '+' : ''}{rival.netrtg} · Últ.5 {rival.forma5}</div>
            </div>
          </div>

          <div className="analisis-resumen">
            <span className="analisis-badge">{duelo.pronostico}</span>
            <span className="analisis-badge">{duelo.ritmo}</span>
          </div>

          {/* 1. Análisis del rival */}
          <h3 className="seccion">Así juega {rival.nombre}</h3>
          <AnalisisEquipo equipo={rival} equipos={equipos} />

          {/* 2. Jugadores a vigilar */}
          {jugadoresClave.length > 0 && (
            <>
              <h3 className="seccion">Jugadores a vigilar</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="izq">Jugador</th><th>PJ</th><th>MIN</th><th>PTS</th>
                      <th>REB</th><th>AST</th><th>VAL</th><th>TS%</th><th>USG%</th>
                      <th className="izq">Perfil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadoresClave.map(j => {
                      const p = j.percentiles;
                      const perfil = [];
                      if (p) {
                        if (p.ptPorPartido?.grp >= 85) perfil.push('anotador de élite del grupo');
                        else if (p.ptPorPartido?.grp >= 70) perfil.push('buen anotador');
                        if (p.rtPorPartido?.grp >= 85) perfil.push('dominante al rebote');
                        if (p.asPorPartido?.grp >= 85) perfil.push('gran generador de juego');
                        if (p.ts?.grp >= 85) perfil.push('muy eficiente');
                      }
                      if (j.usg >= 28) perfil.push('centraliza el ataque');
                      return (
                        <tr key={j.nombre}>
                          <td className="izq">
                            <span className="enlace" onClick={() => onVerJugador(j.idJugador)}>{j.nombre}</span>
                          </td>
                          <td>{j.pj}</td><td>{j.minPorPartido}</td><td>{j.ptPorPartido}</td>
                          <td>{j.rtPorPartido}</td><td>{j.asPorPartido}</td><td>{j.vaPorPartido}</td>
                          <td>{j.ts}</td><td>{j.usg}</td>
                          <td className="izq duelo-detalle">{perfil.join(', ') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 3. El cruce */}
          <h3 className="seccion">El cruce de estilos</h3>
          <div className="analisis-grid">
            {tablaDuelo(duelo.ataqueA, equipo.nombre, rival.nombre)}
            {tablaDuelo(duelo.ataqueB, rival.nombre, equipo.nombre)}
          </div>
          <div className="analisis-bloque analisis-claves" style={{ marginTop: 14 }}>
            <div className="analisis-titulo">Claves del partido</div>
            <ul className="analisis-lista">
              {duelo.claves.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

          {/* 4. Comparativa directa */}
          <h3 className="seccion">Comparativa directa</h3>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'right' }}>{equipo.nombre}</th>
                  <th style={{ textAlign: 'center' }}>Métrica</th>
                  <th className="izq">{rival.nombre}</th>
                </tr>
              </thead>
              <tbody>
                {METRICAS_COMPARATIVA.map(mc => {
                  const va = equipo[mc.clave], vb = rival[mc.clave];
                  let ganaA = false, ganaB = false;
                  if (!mc.texto && !mc.neutra) {
                    ganaA = mc.menosEsMejor ? va < vb : va > vb;
                    ganaB = mc.menosEsMejor ? vb < va : vb > va;
                  }
                  return (
                    <tr key={mc.clave}>
                      <td className={ganaA ? 'domina-a' : ''} style={{ textAlign: 'right' }}>{va}</td>
                      <td className="metrica">{mc.titulo}</td>
                      <td className={`izq ${ganaB ? 'domina-b' : ''}`}>{vb}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="pie" style={{ marginTop: 8 }}>
            Dossier generado con datos de temporada completa (grupo {equipo.grupo}).
            Orientativo, basado solo en estadística.
          </p>
        </>
      )}
    </div>
  );
}
