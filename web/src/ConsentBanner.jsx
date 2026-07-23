import { useEffect, useState } from 'react';

const CLAVE = 'pas-consent'; // 'granted' | 'denied'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  const actualizar = estado => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: estado,
        ad_storage: estado,
        ad_user_data: estado,
        ad_personalization: estado
      });
    }
  };

  useEffect(() => {
    let previa = null;
    try { previa = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }
    if (previa === 'granted') actualizar('granted');
    else if (previa === 'denied') actualizar('denied');
    else setVisible(true);

    // permitir reabrir el banner desde el pie ("gestionar cookies")
    const reabrir = () => setVisible(true);
    window.addEventListener('abrir-consent', reabrir);
    return () => window.removeEventListener('abrir-consent', reabrir);
  }, []);

  const decidir = estado => {
    try { localStorage.setItem(CLAVE, estado); } catch { /* ignora */ }
    actualizar(estado);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="consent-banner">
      <div className="consent-texto">
        Usamos cookies de analítica (Google Analytics) para entender cómo se usa la web y
        mejorarla. No se activan hasta que las aceptes. Puedes rechazarlas y seguir navegando
        con normalidad. Más información en el{' '}
        <a href="/legal" target="_blank" rel="noopener">aviso legal y privacidad</a>.
      </div>
      <div className="consent-botones">
        <button className="consent-btn consent-rechazar" onClick={() => decidir('denied')}>
          Rechazar
        </button>
        <button className="consent-btn consent-aceptar" onClick={() => decidir('granted')}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
