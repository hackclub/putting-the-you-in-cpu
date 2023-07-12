// https://kognise.dev/writing/putting-the-you-in-cpu
// 
// Convert the README.md file in this repo to use the CodeBlock
// MDX component as well as CSS for centering and such.
// 
// A miserable pile of regexes.
const fs = require('fs')
const path = require('path')

const repoPath = '/Users/kognise/Documents/Programming/github.com/kognise/website/'

const getImageDimensions = (imagePath) => {
	const buffer = fs.readFileSync(imagePath, null)
	let dimensions

	if (buffer.subarray(1, 4).toString() === 'PNG') {
		// If it's a PNG, it's trivial to read the width and height.
		const width = buffer.readUInt32BE(16)
		const height = buffer.readUInt32BE(20)
		dimensions = { width, height }
	} else if (buffer.indexOf(Buffer.from([ 0xff, 0xd8 ])) !== -1) {
		// It's a JPEG! This is a bit more complicated, but we can
		// do some rudimentary parsing.
		
		// Find the first instance of the magic number.
		const magicNumber = buffer.indexOf(Buffer.from([ 0xff, 0xda ]))
		if (magicNumber === -1) return null

		// Find the first instance of the width and height.
		const width = buffer.readUInt16BE(magicNumber + 7)
		const height = buffer.readUInt16BE(magicNumber + 5)

		dimensions = { width, height }
	} else {
		throw new Error(`Unsupported image format at ${imagePath}`)
	}

	return dimensions
}

let text = fs.readFileSync('README.md', 'utf8')

// Make code blocks use the CodeBlock component.
// 
// Supported config comments, on separate lines, before the
// code block, separated by one newline, and in this order:
// 
// 1. <!-- name: File name -->
// 2. <!-- startLine: 1234 -->
// 
// Also supported is a link to the source file followed by a
// colon and two newlines before the code block. GitHub line
// references will be parsed from the URL if the hash starts
// with "L1234".
text = text.replace(
	/(?:\[(?<urlName>.+)\]\((?<url>.+)\):\n\n)?(?:<!-- *name: *(?<manualName>[\s\S]+?) *-->\n)?(?:<!-- *startLine: *(?<startLine>\d+) *-->\n)?(?<codeBlock>```.*\n[\s\S]+?\n```)/g,
	(...args) => {
		const groups = args.at(-1)

		let name = groups.manualName ?? groups.urlName
		let startLine = groups.startLine ?? groups.url?.match(/^.+?#L(?<startLine>\d+).*$/)?.groups?.startLine
		let sourceUrl = groups.url

		let code = '<CodeBlock'
		if (name) code += ` name='${name}'`
		if (startLine) code += ` startLine={${startLine}}`
		if (sourceUrl) code += ` sourceUrl='${sourceUrl}'`
		code += `>\n${groups.codeBlock}\n</CodeBlock>`

		return code
	}
)

// Convert image formatting for the web:
// 
// - Width attribute becomes style="max-width".
// - Images wrapped in divs with align="center" become
//   style="margin: 0 auto;".
// - Add correct width and height information to images.
// - Add big class when prefixed with <!-- big -->
// 
// Non-self-closing image tags convert but will break MDX.
// 
// Image attribute order MUST be: src, width, alt
text = text.replace(
	/(?<big><!-- *big *-->\n?)?(?:<p +align='(?<align>[A-z]+)'>\s*)?<img +src='(?<src>[\-_.~!*();:@&=+$,/?%#A-z0-9]+?)'(?: +width='(?<width>\d+)')?(?: +alt='(?<alt>.+)')? *\/?>(?:\s*<\/p>)?/g,
	(...args) => {
		const groups = args.at(-1)
		const dimensions = getImageDimensions(path.join(__dirname, groups.src))

		const styles = []
		if (groups.width) styles.push(`max-width: ${groups.width}px;`)
		if (groups.align === 'center') styles.push('margin: 0 auto;')

		let code = `<img src='${groups.src.replace('images/', '/writing-images/putting-the-you-in-cpu/')}' loading='lazy'`
		if (styles.length > 0) code += ` style='${styles.join(' ')}'`
		if (groups.big) code += ` class='big'`
		if (groups.alt) code += ` alt='${groups.alt}'`
		if (dimensions) code += ` width='${dimensions.width}' height='${dimensions.height}'`
		code += ' />'

		if (!groups.alt) {
			console.log(`Missing alt tag for image: ${groups.src}`)
		}

		return code
	}
)

// Fix all other align="center" instances.
text = text.replace(/<([A-z]+) +align='center'>/g, `<$1 style='text-align: center;'>`)

// Strip everything before "<!-- begin article (do not remove) -->".
text = text.replace(/^[\s\S]+?<!-- *begin article \(do not remove\) *-->\s*/, '')

// Add front matter.
text = `
---
title: Putting the "You" in CPU
abstract: "Do you fully understand how software on your computer runs? I didn't, so I dove down a rabbit hole to write the article that I wish I had. This article covers everything I learned about the innate details of multiprocessing, memory management, system calls, and hardware interrupts — and more importantly, how all of that connects to programs running in the real world!"
date: '2023-07-12'
draft: false
slug: putting-the-you-in-cpu
tab-size: 8
---

import CodeBlock from '../../components/CodeBlock.astro'
`.trim() + '\n\n' + text

// Write the file.
const mdxPath = path.join(repoPath, 'src/content/writing/putting-the-you-in-cpu.mdx')
fs.writeFileSync(fs.existsSync(mdxPath) ? mdxPath : 'out.mdx', text)

// Copy over the images.
const srcImagesPath = path.join(__dirname, 'images/')
const destImagesPath = path.join(repoPath, 'public/writing-images/putting-the-you-in-cpu/')
fs.rmSync(destImagesPath, { recursive: true })
fs.mkdirSync(destImagesPath, { recursive: true })
for (const file of fs.readdirSync(srcImagesPath)) {
	fs.copyFileSync(path.join(srcImagesPath, file), path.join(destImagesPath, file))
}

console.log('All done!')