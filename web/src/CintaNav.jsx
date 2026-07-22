// Cinta de navegación común con el sitio de contenido.
// Debe mantenerse visualmente idéntica a la de site/src/layouts/Base.astro.
export default function CintaNav() {
  return (
    <header className="cinta">
      <div className="cinta-fila">
        <a href="/" className="cinta-marca">Pick<span>&</span>Stats</a>
        <nav className="cinta-nav">
          <a href="/">Inicio</a>
          <a href="/guias">Guías</a>
          <a href="/app/" className="activo">Estadísticas</a>
        </nav>
      </div>
    </header>
  );
}
