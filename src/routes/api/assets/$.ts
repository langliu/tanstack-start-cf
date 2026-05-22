import { createFileRoute } from '@tanstack/react-router'
import { createOssPresignedRequest } from '#/server/admin/oss'

async function serveAsset({ request }: { request: Request }) {
  const key = parseAssetKey(request)

  if (!key || !isPublicAssetKey(key)) {
    return new Response('Not Found', { status: 404 })
  }

  const signedRequest = await createOssPresignedRequest({
    expiresIn: 120,
    key,
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
  })
  const object = await fetch(signedRequest.url, {
    headers: signedRequest.headers,
    method: request.method,
  })

  if (!object.ok) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers(object.headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(request.method === 'HEAD' ? null : object.body, {
    headers,
    status: object.status,
  })
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
