// Configuración del scraper
module.exports = {
  BASE: 'https://baloncestoenvivo.feb.es',
  COMPETICION: { id: 3, nombre: 'tercerafeb' },
  TEMPORADA_DEFECTO: '2025',
  // Solo grupos de liga regular (excluye fases finales y eliminatorias)
  FILTRO_GRUPOS: /liga regular/i,
  PAUSA_MS: 1200,
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
};
