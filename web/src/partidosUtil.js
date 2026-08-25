// Reconcilia los dos formatos de partido del proyecto en una forma común:
//   - partidos.json   (temporadas con datos): local/visitante son {id,nombre},
//                       jornada es "Jornada 1(26/09/2025)", trae resultado/boxscore,
//                       NO trae fecha ni hora sueltas.
//   - calendario.json (fixture de la próxima temporada): local/visitante son strings,
//                       jornada es un número, trae fecha (YYYY-MM-DD) y hora, sin resultado.
//
// Forma común (partido normalizado):
//   { id, grupo, jornadaNum, jornadaEtiqueta, fecha, hora,
//     local:{id,nombre}, visitante:{id,nombre}, resultado, jugado, _raw }

const numeroJornada = j => parseInt((String(j).match(/\d+/) || [0])[0], 10);

const fechaDesdeJornada = j => {
  const m = String(j).match(/\((\d{2})\/(\d{2})\/(\d{4})\)/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const esResultadoJugado = r => !!r && /\d+\s*-\s*\d+/.test(r) &&
  r.split('-').map(n => Number(n.trim())).every(n => !isNaN(n));

function desdeResultados(p) {
  const jugado = esResultadoJugado(p.resultado);
  return {
    id: String(p.id),
    grupo: p.grupo,
    jornadaNum: numeroJornada(p.jornada),
    jornadaEtiqueta: p.jornada,
    fecha: fechaDesdeJornada(p.jornada),
    hora: null,
    local: { id: String(p.local?.id ?? ''), nombre: p.local?.nombre ?? '' },
    visitante: { id: String(p.visitante?.id ?? ''), nombre: p.visitante?.nombre ?? '' },
    resultado: p.resultado || null,
    jugado,
    _raw: p,
  };
}

function desdeCalendario(p) {
  return {
    id: String(p.id),
    grupo: p.grupo,
    jornadaNum: numeroJornada(p.jornada),
    jornadaEtiqueta: `Jornada ${numeroJornada(p.jornada)}`,
    fecha: p.fecha || null,
    hora: p.hora || null,
    local: { id: String(p.localId ?? ''), nombre: p.local ?? '' },
    visitante: { id: String(p.visitanteId ?? ''), nombre: p.visitante ?? '' },
    resultado: p.resultado || null,
    jugado: esResultadoJugado(p.resultado),
    _raw: p,
  };
}

// Fusiona resultados + calendario por id. Si un id está en ambos, gana el de
// partidos.json (tiene boxscore), heredando fecha/hora del calendario si faltan.
export function fusionarPartidos(partidosRaw, calendarioRaw) {
  const porId = new Map();

  if (Array.isArray(calendarioRaw)) {
    for (const p of calendarioRaw) {
      const n = desdeCalendario(p);
      porId.set(n.id, n);
    }
  }

  if (Array.isArray(partidosRaw)) {
    for (const p of partidosRaw) {
      const n = desdeResultados(p);
      const previo = porId.get(n.id);
      if (previo) {
        n.fecha = n.fecha || previo.fecha;
        n.hora = n.hora || previo.hora;
      }
      porId.set(n.id, n);
    }
  }

  return [...porId.values()];
}

export function agruparPorJornada(partidos, grupo) {
  const m = new Map();
  partidos
    .filter(p => grupo == null || p.grupo === grupo)
    .forEach(p => {
      if (!m.has(p.jornadaNum)) {
        m.set(p.jornadaNum, { etiqueta: p.jornadaEtiqueta, lista: [] });
      }
      m.get(p.jornadaNum).lista.push(p);
    });
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

export function gruposDePartidos(partidos) {
  return [...new Set(partidos.map(p => p.grupo))].sort();
}
