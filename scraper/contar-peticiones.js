// Contador de peticiones HTTP, para saber cuanto le pedimos a la FEB en cada
// ejecucion (_instrucciones.md 02/11, 2.3: "mide antes de cambiar la
// cadencia"). Se precarga con NODE_OPTIONS="--require .../contar-peticiones.js"
// y se apunta con PETICIONES_LOG a un fichero donde cada proceso de node anade
// UNA linea JSON al salir: {script, args, n, porHost}. Todos los scripts del
// pipeline usan la instancia por defecto de axios, asi que un interceptor
// global las cuenta todas -- reintentos incluidos, que tambien llegan a la FEB.
//
// Debe ser INOCUO: si algo falla aqui (axios aun sin instalar durante `npm ci`,
// log sin permisos...) el proceso sigue como si no existiera. Cada linea de
// codigo esta envuelta por eso.
try {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');
  let n = 0;
  const porHost = {};
  axios.interceptors.request.use(cfg => {
    n++;
    try { const h = new URL(cfg.url, cfg.baseURL).host; porHost[h] = (porHost[h] || 0) + 1; } catch (_) {}
    return cfg;
  });
  process.on('exit', () => {
    try {
      const f = process.env.PETICIONES_LOG;
      if (!f || !n) return;
      fs.appendFileSync(f, JSON.stringify({
        script: path.basename(process.argv[1] || '?'), args: process.argv.slice(2).join(' '), n, porHost,
      }) + '\n');
    } catch (_) {}
  });
} catch (_) { /* axios no disponible todavia: no contamos, no molestamos */ }
