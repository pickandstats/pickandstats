import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const guias = (await getCollection('guias'))
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());

  return rss({
    title: 'Pick&Stats · Guías',
    description: 'Guías sobre el baloncesto FEB: ascensos, descensos, composición de las categorías y cómo leer la estadística avanzada.',
    site: context.site,
    items: guias.map(guia => ({
      title: guia.data.titulo,
      description: guia.data.descripcion,
      pubDate: guia.data.actualizado ?? guia.data.fecha,
      link: `/guias/${guia.id}/`,
    })),
    customData: '<language>es-ES</language>',
  });
}
