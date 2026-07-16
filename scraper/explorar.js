// Script explorador: detecta cómo sirve la FEB los datos de una competición
const axios = require('axios');

const URL = 'https://baloncestoenvivo.feb.es/estadisticas/tercerafeb/3/2025';

async function explorar() {
  console.log('Explorando:', URL, '\n');

  try {
    const res = await axios.get(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const html = res.data;
    console.log('Status:', res.status);
    console.log('Tamaño del HTML:', html.length, 'caracteres\n');

    // Buscar posibles llamadas a API / endpoints en el HTML
    const patrones = [
      /https?:\/\/[^\s"'<>]+\.(?:json|aspx|ashx|svc)[^\s"'<>]*/gi,
      /\/api\/[^\s"'<>]+/gi,
      /widgets?\.php[^\s"'<>]*/gi,
      /livestats[^\s"'<>]*/gi,
      /genius[^\s"'<>]*/gi
    ];

    const encontrados = new Set();
    for (const p of patrones) {
      const matches = html.match(p) || [];
      matches.forEach(m => encontrados.add(m));
    }

    if (encontrados.size > 0) {
      console.log('=== Posibles endpoints / referencias de datos ===');
      [...encontrados].forEach(e => console.log('  ', e));
    } else {
      console.log('No se detectaron endpoints obvios en el HTML inicial.');
      console.log('(Probablemente los datos se cargan vía JavaScript tras el render.)');
    }

    // Buscar bloques de JSON embebido
    console.log('\n=== Buscando JSON embebido ===');
    const jsonBlocks = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log('Bloques <script> encontrados:', jsonBlocks.length);

    // Buscar IDs numéricos que puedan ser de grupo/competición
    const ids = html.match(/(?:grupo|group|idfase|fase|idcompeticion)["'\s:=]+(\d+)/gi) || [];
    if (ids.length) {
      console.log('\n=== Referencias a IDs de grupo/fase ===');
      [...new Set(ids)].forEach(id => console.log('  ', id));
    }

  } catch (err) {
    console.error('Error al explorar:', err.message);
    if (err.response) console.error('Status:', err.response.status);
  }
}

explorar();
