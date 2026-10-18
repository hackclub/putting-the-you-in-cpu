import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import { unified } from '@astrojs/markdown-remark'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypePresetMinify from 'rehype-preset-minify'
import vercel from '@astrojs/vercel'

const rehypeExternalLinksConfig = [
	rehypeExternalLinks,
	{ target: '_blank', rel: ['noopener', 'noreferrer'] }
]

export default defineConfig({
	site: 'https://cpu.land/',
	trailingSlash: 'never',
	output: 'static',
	compressHTML: true,
	adapter: vercel(),
	server: {
		port: parseInt(process.env.PORT || '3000')
	},
	integrations: [
		mdx({
			processor: unified({
				smartypants: true,
				rehypePlugins: [ rehypeExternalLinksConfig, rehypePresetMinify ]
			})
		}),
		sitemap({
			filter: page => page !== 'https://cpu.land/404'
		})
	],
	markdown: {
		processor: unified({
			smartypants: true,
			rehypePlugins: [ rehypeExternalLinksConfig ]
		}),
		shikiConfig: {
			theme: 'one-dark-pro'
		}
	}
})
