// Vercel Node.js serverless entry for TanStack Start
// Converts between Node.js IncomingMessage/ServerResponse and Web Request/Response

import server from '../dist/server/server.js'

/**
 * Vercel Node.js runtime handler.
 */
export default async function handler(req, res) {
  try {
    // Build the full URL from the incoming request
    const host = req.headers.host || 'localhost'
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const url = `${protocol}://${host}${req.url}`

    // Collect request body
    const chunks = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks)

    // Build Web Request
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
      }
    }

    const webRequest = new Request(url, {
      method: req.method || 'GET',
      headers,
      body:
        req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0
          ? body
          : undefined,
    })

    // Forward through TanStack Start
    const webResponse = await server.fetch(webRequest)

    // Convert Web Response back to Node.js response
    res.statusCode = webResponse.status
    res.statusMessage = webResponse.statusText

    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    if (webResponse.body) {
      const reader = webResponse.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (error) {
    console.error('Server error:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain')
    res.end('Internal Server Error')
  }
}
