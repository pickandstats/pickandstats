import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CLAVES } from './familias';

const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guias' }),
  schema: z.object({
    titulo: z.string(),
    // Resumen largo: es lo que se lee en la tarjeta del índice y en el RSS.
    descripcion: z.string(),
    // Meta descripción para el <head>. Google trunca alrededor de 155 caracteres,
    // así que el límite se valida en el build en vez de confiar en el ojo.
    descripcionSeo: z.string().max(155),
    // Familia obligatoria: si una guía nueva se olvida de declararla, el build falla
    // en vez de dejarla fuera del índice en silencio. Las claves viven en familias.ts.
    familia: z.enum(CLAVES),
    // Orden dentro de su familia. Sin él, la guía cae al final del bloque.
    orden: z.number().int().positive().optional(),
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    // Temporada de la que salen los ejemplos. Se fija al escribir la guía y no se
    // refresca: las cifras ilustran la métrica, no la temporada en curso.
    temporada: z.string().regex(/^\d{4}\/\d{2}$/, 'Formato esperado: 2025/26').optional(),
  }),
});

// Los cortes del observatorio son posts fechados que se suceden tres veces por
// temporada (inicio/mitad/cierre): no caben en `guias`, que son perennes y con
// ejemplos congelados a propósito. Colección aparte, sin `familia` ni `orden`
// (aquí ordena la fecha, descendente) y con `temporada`/`corte` obligatorios:
// un corte del observatorio siempre pertenece a una temporada y a un momento
// de ella, a diferencia de una guía.
const observatorio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/observatorio' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    descripcionSeo: z.string().max(155),
    temporada: z.string().regex(/^\d{4}\/\d{2}$/, 'Formato esperado: 2026/27'),
    corte: z.enum(['inicio', 'mitad', 'cierre']),
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
  }),
});

export const collections = { guias, observatorio };
