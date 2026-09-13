import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const guias = await getCollection('guias');
  const observatorio = await getCollection('observatorio');

  const items = [
    ...guias.map(guia => ({
      title: guia.data.titulo,
      description: guia.data.descripcion,
      pubDate: guia.data.actualizado ?? guia.data.fecha,
      link: `/guias/${guia.id}/`,
    })),
    ...observatorio.map(post => ({
      title: post.data.titulo,
      description: post.data.descripcion,
      pubDate: post.data.actualizado ?? post.data.fecha,
      link: `/observatorio/${post.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Pick&Stats · Guías y Observatorio',
    description: 'Guías sobre el baloncesto FEB (ascensos, descensos, composición de las categorías, cómo leer la estadística avanzada) y el observatorio de estilo de juego.',
    site: context.site,
    items,
    customData: '<language>es-ES</language>',
  });
}
