// Clasificacion contra el orden OFICIAL de la FEB, con datos fijos (lote 36).
// Las dos tablas las comparo la sesion en la nube a mano con la web de la FEB el
// 17/11/2026: Tercera B-B tras la J7 (7 de 14 posiciones mal, lider incluido) y
// Primera tras la J8 (6 de 18 mal); mas la tabla final de Tercera C-A 2025/26
// (reinicio del desempate en un empate a cuatro). Los partidos estan congelados en
// test/fixtures/clasificacion-2026-lote36.json para que el test no dependa del
// scraping de la semana.
//
// Uso: node test/verificar-clasificacion.mjs   (sale con 1 si algo no cuadra)
import { readFileSync } from 'node:fs';
import { ordenarClasificacion, reglaClasificacion, totalJornadasGrupo } from '../web/src/ordenClasificacion.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/clasificacion-2026-lote36.json', import.meta.url)));

let fallos = 0;
const comprobar = (etiqueta, ok, detalle = '') => {
  if (ok) console.log('   ✓ ' + etiqueta);
  else { fallos++; console.log(`   ✗ ${etiqueta}${detalle ? ': ' + detalle : ''}`); }
};

// Orden oficial. En Primera solo se conocen con certeza las posiciones que la
// comparacion encontro distintas; el resto coincidia y no se lista.
const ESPERADO = {
  tercera_BB_J7: {
    totalJornadas: 26,
    posiciones: {
      1: 'FUNDAL ALCOBENDAS', 2: 'IMPLICA REAL CANOE', 3: 'GRAN CANARIA',
      4: 'LUJISA GUADALAJARA BASKET', 5: 'INMOBILIARIA GÁLVEZ SANTA CRUZ',
      6: 'GINELUX TELDE', 7: 'GRUPO EGIDO PINTOBASKET', 8: 'UROS DE RIVAS',
      9: 'BALONCESTO ALCALA', 10: 'BALONCESTO TALAVERA', 11: 'RECUCYM BAZU',
      12: 'NÁUTICO TENERIFE', 13: 'CB 7 PALMAS', 14: 'BASKET CERVANTES CIUDAD REAL',
    },
  },
  primera_J8: {
    totalJornadas: 34,
    posiciones: {
      10: 'INSOLAC CAJA 87', 11: 'CAJA RURAL CB ZAMORA',
      14: 'BÀSQUET MENORCA', 15: 'CAJASOL COTO CÓRDOBA',
      16: 'GRUPO URETA TIZONA BURGOS', 17: 'INVEREADY ASKATUAK GIPUZKOA',
    },
  },
  // Empate a cuatro a 11-15 (tabla final oficial, leida con
  // verificar-clasificacion-oficial.js --temporada 2025): Calvia y Barbastro
  // quedan 4-2 en la miniliga y el procedimiento se reinicia entre ellos dos.
  tercera_CA_2025_J26: {
    totalJornadas: 26,
    posiciones: {
      8: 'LETRA CORPOREA BARBASTRO', 9: 'FLANIGAN CALVIÀ',
      10: 'C.B.ROSER', 11: 'IMMO SA MARINA CIUTAT D’INCA BASQUET',
    },
  },
  // Regla por PUNTOS en temporadas cerradas (lote 38). Tabla oficial completa
  // tras la J30: lider Leyma (25-4, 54 PT) por delante de Obradoiro (25-3, 53 PT);
  // con victorias y porcentaje Obradoiro saldria primero.
  primera_2025_J30: {
    totalJornadas: 34,
    posiciones: {
      1: 'LEYMA CORUÑA', 2: 'MONBUS OBRADOIRO', 3: 'SÚPER AGROPAL PALENCIA',
      4: 'MOVISTAR ESTUDIANTES', 5: 'INVEREADY GIPUZKOA', 6: 'ALIMERKA OVIEDO BALONCESTO',
      7: 'FLEXICAR FUENLABRADA', 8: 'HLA ALICANTE', 9: 'HESTIA MENORCA',
      10: 'CAJA RURAL CB ZAMORA', 11: 'GRUPO ALEGA CANTABRIA', 12: 'CLOUD.GAL OURENSE BALONCESTO',
      13: 'FIBWI MALLORCA BASQUET PALMA', 14: 'GRUPO CAESA SEGUROS FC CARTAGENA CB',
      15: 'MELILLA CIUDAD DEL DEPORTE', 16: 'PALMER BASKET MALLORCA PALMA', 17: 'GRUPO URETA TIZONA BURGOS',
    },
  },
  // La incomparecencia vale 0 puntos: Uixo (13-13, 38 PT) empata con Tabernes
  // (12-14, 38 PT) y el 84.2.c lo manda al ultimo puesto del empate.
  tercera_EA_2025_J26: {
    totalJornadas: 26,
    posiciones: { 6: 'CB JOVENS ALMÀSSERA', 7: 'CB TABERNES BLANQUES - FERNANDO GIL', 8: 'HALAL FOOD QUALITY UIXÓ BÀSQUET', 9: 'CB MORVEDRE' },
  },
};

for (const [clave, { totalJornadas, posiciones }] of Object.entries(ESPERADO)) {
  const { partidos, jornada, temporada } = fx[clave];
  console.log(`\n### ${clave} ###`);
  const total = totalJornadasGrupo(partidos);
  comprobar(`liga regular de ${totalJornadas} jornadas`, total === totalJornadas, `obtenido ${total}`);
  // REGLA permite forzar una regla para el control negativo (REGLA=victorias).
  const regla = process.env.REGLA || reglaClasificacion(temporada);
  const tabla = ordenarClasificacion(partidos, { jornada, totalJornadas: total, regla });
  for (const [pos, nombre] of Object.entries(posiciones)) {
    const obtenido = tabla[pos - 1]?.nombre;
    comprobar(`${pos}. ${nombre}`, obtenido === nombre, `obtenido ${obtenido}`);
  }
}

// Las dos fuentes del total tienen que coincidir: el calendario cuando existe y
// el recuento de equipos cuando no (temporadas cerradas).
console.log('\n### Total de jornadas: calendario frente a recuento de equipos ###');
const partidosBB = fx.tercera_BB_J7.partidos;
const calendarioFalso = Array.from({ length: 26 }, (_, i) => ({ jornada: i + 1 }));
comprobar('con calendario de 26', totalJornadasGrupo(partidosBB, calendarioFalso) === 26);
// Grupo impar (13 equipos): cada jornada descansa uno, la liga dura 2N = 26.
const impar = partidosBB.filter(p => p.local.nombre !== 'UROS DE RIVAS' && p.visitante.nombre !== 'UROS DE RIVAS');
comprobar('13 equipos sin calendario -> 26', totalJornadasGrupo(impar) === 26, `obtenido ${totalJornadasGrupo(impar)}`);

console.log(fallos ? `\n${fallos} fallo(s).` : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
