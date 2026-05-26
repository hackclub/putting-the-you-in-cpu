import { z, defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

export const collections = {
	chapters: defineCollection({
		loader: glob({
			pattern: '**/*.mdx',
			base: './src/content/chapters',
			generateId: ({ data }) => data.slug as string
		}),
		schema: z.object({
			chapter: z.number(),
			title: z.string(),
			shortname: z.string(),
			slug: z.string(),
			updatedAt: z.date()
		})
	})
}
