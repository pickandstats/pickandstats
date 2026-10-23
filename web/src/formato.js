// Capa unica de formato numerico para la app (_instrucciones.md 23/10,
// punto 2). Igual que las formulas tienen una casa en las guias, el
// formato tiene una aqui: nadie en web/ llama a toFixed() ni monta un
// Intl.NumberFormat por su cuenta -- se pasa por estas cinco funciones.
//
// Contrato de bordes (igual en las cinco):
//  - `null`/`undefined`/`NaN` -> '—'. Es la decision que ya tomamos esta
//    semana con los minutos del formato viejo de las actas: un dato
//    ausente no es un cero, y la capa lo hace por defecto en todas partes.
//  - Un `string` pasa tal cual, sin tocar. Es lo que ya hacia el `fmt` de
//    Equipo.jsx, y permite usar la capa en renderizadores genericos donde
//    la misma columna puede traer un numero o un record tipo "3-2".
//  - La capa recibe el numero CRUDO del JSON (lo que escribe calcular.js
//    con r1/r2, sin formatear) y decide los decimales ella sola. No se le
//    pasa algo que ya haya pasado por un toFixed: redondear dos veces no es
//    gratis y no hace falta.
//
// Numeros que NUNCA se formatean con esto, por principio: temporadas y
// años, numeros de jornada, dorsales, ids de partido/equipo/jugador,
// records tipo forma5 ("3-2"), y cualquier numero que despues se sume, se
// ordene, se compare o se use como `key` -- justo lo que esta capa
// devuelve (un string con coma decimal) rompe silenciosamente si entra en
// cualquiera de esas operaciones.
//
// Nota sobre el signo: las tablas de las guias (texto escrito a mano) usan
// el menos tipografico (−, U+2212); Intl usa el guion ASCII (-, U+002D).
// Van a diferir entre la app y las guias, y esta bien asi -- no "arreglar"
// uno para que coincida con el otro.

const AUSENTE = '—';

const esAusente = v => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

const enteros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dosDecimales = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unDecimalConSigno = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero',
});
// style:'percent' espera una fraccion (0,073), no una cifra ya en escala de
// porcentaje (7,3) -- de ahi el /100 en pct1. A cambio, Intl pone el
// espacio duro antes del "%" el solo (comprobado: U+00A0, no un espacio
// normal), que es lo correcto en español y lo que se queria sin montarlo
// a mano.
const unDecimalPorcentaje = new Intl.NumberFormat('es-ES', {
  style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
});

// Envuelve un formateador con el contrato de bordes comun: string tal
// cual, ausente -> '—', numero crudo al formateador.
const envolver = formatear => v => {
  if (typeof v === 'string') return v;
  if (esAusente(v)) return AUSENTE;
  return formatear(v);
};

export const n0 = envolver(v => enteros.format(v));
export const n1 = envolver(v => unDecimal.format(v));
export const n2 = envolver(v => dosDecimales.format(v));
export const s1 = envolver(v => unDecimalConSigno.format(v));
export const pct1 = envolver(v => unDecimalPorcentaje.format(v / 100));

// Para el uso por configuracion de columnas (punto 4): `{ clave, fmt: 'n1' }`
// busca la funcion por nombre en vez de importarlas todas una a una.
export const FORMATOS = { n0, n1, n2, s1, pct1 };
