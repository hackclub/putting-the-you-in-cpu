// https://kognise.dev/writing/putting-the-you-in-cpu
// 
// Convert the README.md file in this repo to use the CodeBlock
// MDX component as well as CSS for centering and such.
// 
// A miserable pile of regexes.
const fs = require('fs')

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
//   (!! UNIMPLEMENTED !!)
// - Add big class when prefixed with <!-- big -->
// 
// Non-self-closing image tags convert but will break MDX.
// 
// Image attribute order MUST be: src, width
text = text.replace(
	/(?<big><!-- *big *-->\n?)?(?:<p +align=['"](?<align>[A-z]+)['"]>\s*)?<img +src=['"](?<src>[\-_.~!*();:@&=+$,/?%#A-z0-9]+?)['"](?: +width=['"](?<width>\d+)['"])? *\/?>(?:\s*<\/p>)?/g,
	(...args) => {
		const groups = args.at(-1)

		const styles = []
		if (groups.width) styles.push(`max-width: ${groups.width}px;`)
		if (groups.align === 'center') styles.push('margin: 0 auto;')

		let code = `<img src='${groups.src}'`
		if (styles.length > 0) code += ` style='${styles.join(' ')}'`
		if (groups.big) code += ` class='big'`
		code += ' />'

		return code
	}
)

// Fix all other align="center" instances.
text = text.replace(/<([A-z]+) +align=['"]center['"]>/g, `<$1 style='text-align: center;'>`)
 
// Strip everything before "<!-- begin article (do not remove) -->".
text = text.replace(/^[\s\S]+?<!-- *begin article \(do not remove\) *-->\s*/, '')

// Add front matter.
text = `
---
title: Putting the "You" in CPU
abstract: "Do you fully understand how software on your computer runs? I didn't, so I dove down a research rabbit hole to write the article that I wish I had. This article covers everything I learned about the innate details of multiprocessing, memory management, system calls, and hardware interrupts — and more importantly, how all of that connects to programs running in the real world!"
date: '2023-06-22'
draft: false
slug: putting-the-you-in-cpu
tab-size: 8
---

import CodeBlock from '../../components/CodeBlock.astro'
`.trim() + '\n\n' + text

const myPath = '/Users/kognise/Documents/Programming/github.com/kognise/website/src/content/writing/putting-the-you-in-cpu.mdx'
fs.writeFileSync(fs.existsSync(myPath) ? myPath : 'out.mdx', text)