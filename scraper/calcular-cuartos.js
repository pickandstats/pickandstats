// Agrega los datos por cuarto (de data/raw/<comp>/<temp>/actas/) en:
//   - jugadores-cuartos.json: distribucion por cuarto + indice clutch por jugador
//   - equipos-cuartos.json:   pace y rating ofensivo/defensivo por cuarto
//
// No toca calcular.js. Cruza acta (dorsal) con boxscore raw (idJugador) para
// asociar cada jugador a su licencia FEB. Solo procesa lo que tenga acta.
//
// Uso: node scraper/calcular-cuartos.js --competicion 1 --temporada 2025
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const COMPS = { 1: 'primerafeb', 2: 'segundafeb', 3: 'tercerafeb' };
const comp = val('--competicion') || '1';
const temp = val('--temporada') || '2025';
const compNombre = COMPS[comp];
if (!compNombre) { console.error('Competicion no valida'); process.exit(1); }

const UMBRAL_AJUSTADO = 8; // diferencia maxima al inicio del ultimo cuarto

const baseRaw = path.join('data', 'raw', compNombre, temp);
// Mapa idFeb -> slug (idClub) para dar a cada equipo su identificador estable,
// ya que el id de la FEB cambia cada temporada y el nombre lleva patrocinador.
const rutaEquipos = path.join('web', 'public', 'data', compNombre, temp, 'equipos.json');
const mapaSlug = {};
if (fs.existsSync(rutaEquipos)) {
  const eqs = JSON.parse(fs.readFileSync(rutaEquipos, 'utf8'));
  const arr = Array.isArray(eqs) ? eqs : (eqs.equipos || Object.values(eqs)[0]);
  arr.forEach(e => { if (e.id && e.idClub) mapaSlug[String(e.id)] = e.idClub; });
}
const dirActas = path.join(baseRaw, 'actas');
if (!fs.existsSync(dirActas)) { console.error('No hay actas en', dirActas); process.exit(1); }

// Indice dorsal->idJugador por partido, leyendo el boxscore raw
function puenteDorsalId(idPartido) {
  for (const g of fs.readdirSync(baseRaw)) {
    const f = path.join(baseRaw, g, idPartido + '.json');
    if (fs.existsSync(f)) {
      const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
      const map = { local: {}, visitante: {} };
      (raw.boxscore.local || []).forEach(j => { map.local[j.dorsal] = j; });
      (raw.boxscore.visitante || []).forEach(j => { map.visitante[j.dorsal] = j; });
      // slug estable de cada equipo, resuelto desde el id FEB via equipos.json
      map.slugLocal = mapaSlug[String((raw.equipoLocal || {}).id)] || null;
      map.slugVisitante = mapaSlug[String((raw.equipoVisitante || {}).id)] || null;
      return map;
    }
  }
  return null;
}

const jugadores = {};  // idJugador -> agregado por cuarto
const equipos = {};    // equipoId -> agregado por cuarto
const contextoPartidos = {}; // idPartido -> contextoPorCuarto (para la ficha de partido)

function initJug(id, nombre, equipoId, equipo) {
  if (!jugadores[id]) jugadores[id] = {
    idJugador: id, nombre, equipoId, equipo,
    // por cuarto (indice 0..3 = Q1..Q4; 4+ = prorrogas agregadas)
    porCuarto: [1,2,3,4].map(() => ({ pj: 0, pt: 0, as: 0, val: 0 })),
    // clutch: produccion en ultimo cuarto de partidos ajustados
    clutch: { partidos: 0, pt: 0, as: 0 },
  };
  return jugadores[id];
}

function initEq(id, nombre) {
  if (!equipos[id]) equipos[id] = {
    equipoId: id, equipo: nombre,
    porCuarto: [1,2,3,4].map(() => ({
      pj: 0, pf: 0, pc: 0, pos: 0, posRival: 0,
      // contexto acumulado: a favor (lo que genera) y en contra (lo que concede)
      ctxFavor: { contraataque: 0, pintura: 0, segundaOportunidad: 0, trasPerdida: 0, banquillo: 0 },
      ctxContra: { contraataque: 0, pintura: 0, segundaOportunidad: 0, trasPerdida: 0, banquillo: 0 },
    })),
  };
  return equipos[id];
}

const posesiones = t => (t.t2i + t.t3i) - t.ro + t.per + 0.44 * t.tli;
const sumaEquipoCuarto = jugs => jugs.reduce((s, j) => ({
  pt: s.pt + j.pts, t2i: s.t2i + j.t2.i, t3i: s.t3i + j.t3.i,
  tli: s.tli + j.tl.i, ro: s.ro + j.ro, per: s.per + j.per,
}), { pt: 0, t2i: 0, t3i: 0, tli: 0, ro: 0, per: 0 });

let nPartidos = 0, sinPuente = 0;
for (const fichero of fs.readdirSync(dirActas).filter(f => f.endsWith('.json'))) {
  const acta = JSON.parse(fs.readFileSync(path.join(dirActas, fichero), 'utf8'));
  const puente = puenteDorsalId(acta.partido);
  if (!puente) { sinPuente++; continue; }
  nPartidos++;
  // recolectar el contexto por cuarto de cada partido (para la ficha de partido)
  if (acta.contextoPorCuarto) contextoPartidos[acta.partido] = acta.contextoPorCuarto;

  // ¿fue partido ajustado? diferencia al inicio del ULTIMO cuarto de liga (4º)
  // = suma de los 3 primeros parciales
  const par = acta.parciales;
  let ajustado = false;
  if (par.length >= 4) {
    const locAntesUlt = par.slice(0, 3).reduce((a, p) => a + p.local, 0);
    const visAntesUlt = par.slice(0, 3).reduce((a, p) => a + p.visitante, 0);
    ajustado = Math.abs(locAntesUlt - visAntesUlt) <= UMBRAL_AJUSTADO;
  }
  const ladoNombre = { 0: acta.local, 1: acta.visitante };

  acta.porCuarto.forEach((cuarto, ci) => {
    if (!cuarto) return;
    cuarto.forEach((equipoCuarto, ei) => {
      const lado = ei === 0 ? 'local' : 'visitante';
      // equipo: pace/rating por cuarto (solo Q1..Q4; prorrogas fuera del agregado por cuarto)
      if (ci < 4) {
        const rivalCuarto = cuarto[ei === 0 ? 1 : 0];
        const t = sumaEquipoCuarto(equipoCuarto.jugadores);
        const tR = sumaEquipoCuarto(rivalCuarto.jugadores);
        // idEquipo desde el puente (cualquier jugador con match)
        const equipoNom = ladoNombre[ei];
        // clave estable: slug del equipo (idClub). Si no se resolvió, cae al nombre.
        const slug = ei === 0 ? puente.slugLocal : puente.slugVisitante;
        const claveEq = slug || equipoNom;
        const E = initEq(claveEq, equipoNom);
        const q = E.porCuarto[ci];
        q.pj++; q.pf += t.pt; q.pc += tR.pt;
        q.pos += posesiones(t); q.posRival += posesiones(tR);
        // contexto por cuarto: favor = lado propio, contra = lado rival
        const cx = acta.contextoPorCuarto && acta.contextoPorCuarto[ci];
        if (cx) {
          const ladoP = ei === 0 ? "local" : "visitante";
          const ladoR = ei === 0 ? "visitante" : "local";
          for (const campo of ["contraataque","pintura","segundaOportunidad","trasPerdida","banquillo"]) {
            if (cx[campo]) {
              q.ctxFavor[campo] += cx[campo][ladoP] || 0;
              q.ctxContra[campo] += cx[campo][ladoR] || 0;
            }
          }
        }
      }
      // jugadores
      equipoCuarto.jugadores.forEach(j => {
        const raw = puente[lado][j.dorsal];
        if (!raw || !raw.idJugador) return; // sin puente a licencia: omitir
        const J = initJug(raw.idJugador, raw.nombre, raw.equipoId || null, ladoNombre[ei]);
        const idx = Math.min(ci, 3); // prorrogas se suman al bucket del Q4? No: solo Q1..Q4 aqui
        if (ci < 4) {
          const q = J.porCuarto[ci];
          q.pj++; q.pt += j.pts; q.as += j.as; q.val += j.val;
        }
        // clutch: ultimo cuarto de liga (Q4, ci===3) O prorrogas (ci>=4), si ajustado
        if (ajustado && ci >= 3) {
          J.clutch.pt += j.pts; J.clutch.as += j.as;
          if (ci === 3) J.clutch.partidos++; // cuenta una vez por partido (en el Q4)
        }
      });
    });
  });
}

// Construir salidas
const r1 = x => Math.round(x * 10) / 10;
const salidaJug = Object.values(jugadores).map(J => ({
  idJugador: J.idJugador, nombre: J.nombre, equipo: J.equipo,
  porCuarto: J.porCuarto.map(q => ({
    pj: q.pj,
    ptMedia: q.pj ? r1(q.pt / q.pj) : 0,
    asMedia: q.pj ? r1(q.as / q.pj) : 0,
    valMedia: q.pj ? r1(q.val / q.pj) : 0,
  })),
  clutch: {
    partidosAjustados: J.clutch.partidos,
    pt: J.clutch.pt, as: J.clutch.as,
    ptMasAs: J.clutch.pt + J.clutch.as,
    ptMasAsPorPartido: J.clutch.partidos ? r1((J.clutch.pt + J.clutch.as) / J.clutch.partidos) : 0,
  },
}));

const salidaEq = Object.values(equipos).map(E => ({
  equipoId: E.equipoId,
  equipo: E.equipo,
  porCuarto: E.porCuarto.map(q => {
    const media = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, q.pj ? r1(v / q.pj) : 0]));
    return {
      pj: q.pj,
      pace: q.pj ? r1(q.pos / q.pj) : 0,
      ortg: q.pos ? r1(100 * q.pf / q.pos) : 0,
      drtg: q.posRival ? r1(100 * q.pc / q.posRival) : 0,
      ctxFavor: media(q.ctxFavor),
      ctxContra: media(q.ctxContra),
    };
  }),
}));

const dirOut = path.join('web', 'public', 'data', compNombre, temp);
fs.mkdirSync(dirOut, { recursive: true });
fs.writeFileSync(path.join(dirOut, 'jugadores-cuartos.json'), JSON.stringify(salidaJug, null, 1));
fs.writeFileSync(path.join(dirOut, 'equipos-cuartos.json'), JSON.stringify(salidaEq, null, 1));
// contexto por cuarto de cada partido, indexado por id, sin indentar (carga diferida en la ficha de partido)
fs.writeFileSync(path.join(dirOut, 'partidos-contexto.json'), JSON.stringify(contextoPartidos));

console.log(`${compNombre} ${temp}: ${nPartidos} actas procesadas` + (sinPuente ? ` (${sinPuente} sin boxscore raw)` : ''));
console.log(`  jugadores-cuartos.json: ${salidaJug.length} jugadores`);
console.log(`  equipos-cuartos.json: ${salidaEq.length} equipos`);
