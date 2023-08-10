// Vercel edge middleware, because rewrites aren't supported for Astro projects?
export const config = {
	matcher: '/stats/:path*'
}

export default async function middleware(request: Request): Promise<Response> {
	const url = new URL(request.url)
   
	if (url.pathname === '/stats/js/script.js') {
		const res = await fetch('https://plausible.io/js/script.js')
		const body = await res.text()
		return new Response(body, {
			headers: {
				'content-type': res.headers.get('content-type') || ''
			}
		})
	} else if (url.pathname === '/stats/api/event') {
		const res = await fetch('https://plausible.io/api/event', {
			method: 'POST',
			body: request.body,
			headers: {
				'content-type': request.headers.get('content-type') || ''
			}
		})
		const body = await res.text()
		return new Response(body, {
			headers: {
				'content-type': res.headers.get('content-type') || ''
			}
		})
	} else {
		return Response.error()
	}
}