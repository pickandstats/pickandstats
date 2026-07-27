import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

(function () {
  var p = new URLSearchParams(window.location.search);
  var r = p.get('redir');
  if (r) {
    // La 404 guarda la ruta con el prefijo /app; el router espera la ruta sin el
    // basename, así que lo recortamos antes de restaurarla.
    var base = import.meta.env.BASE_URL.replace(/\/$/, '');   // "/app"
    var destino = r.indexOf(base + '/') === 0 ? r.slice(base.length) : r;
    window.history.replaceState(null, '', base + destino);
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
