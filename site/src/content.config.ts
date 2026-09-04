import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guias' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    // Temporada de la que salen los ejemplos. Se fija al escribir la guía y no se
    // refresca: las cifras ilustran la métrica, no la temporada en curso.
    temporada: z.string().regex(/^\d{4}\/\d{2}$/, 'Formato esperado: 2025/26').optional(),
  }),
});

export const collections = { guias };
