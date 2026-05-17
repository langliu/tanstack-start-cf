import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'

async function serveAsset({ request }: { request: Request }) {
  const key = parseAssetKey(request)

  if (!key || !isPublicAssetKey(key)) {
    return new Response('Not Found', { status: 404 })
  }

  const object = await env.IMAGE_BUCKET.get(key)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
}

function isPublicAssetKey(key: string) {
  return key.startsWith('images/') || key.startsWith('model-avatars/')
}

function parseAssetKey(request: Request) {
  const pathname = new URL(request.url).pathname
  const prefix = '/api/assets/'

  if (!pathname.startsWith(prefix)) {
    return null
  }

  return pathname
    .slice(prefix.length)
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/')
}

export const Route = createFileRoute('/api/assets/$')({
  server: {
    handlers: {
      GET: serveAsset,
      HEAD: serveAsset,
    },
  },
})
