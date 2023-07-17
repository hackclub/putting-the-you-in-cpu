import { z, defineCollection } from 'astro:content'

export const collections = {
	chapters: defineCollection({
		schema: z.object({
			chapter: z.number(),
			title: z.string(),
			shortname: z.string(),
			updatedAt: z.date()
		})
	})
}
