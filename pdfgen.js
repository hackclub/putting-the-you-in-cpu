// TODO: Automate this!
const puppeteer = require('puppeteer')
const fs = require('fs/promises')
const process = require('process')

async function pdf(url) {
	const browser = await puppeteer.launch({ headless: 'new' })
	const page = await browser.newPage()
	await page.goto(url, { waitUntil: 'networkidle0' })
	const pdf = await page.pdf({
		format: 'letter',
		printBackground: true
	})
	await browser.close()
	return pdf
}

async function go() {
	await fs.writeFile('public/editions/printable.pdf', await pdf('http://127.0.0.1:3000/editions/one-pager'))
}

go().then(() => {
	console.log('Done!')
	process.exit(0)
}).catch(error => {
	console.error(error)
	process.exit(1)
})