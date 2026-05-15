import '@tanstack/react-start/server-only'

export function createId() {
  return crypto.randomUUID()
}

export function now() {
  return new Date()
}

export function nullableText(value: null | string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function makeSlug(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

export function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function filenameStem(filename: string) {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

export function extensionFromContentType(contentType: string) {
  switch (contentType.toLowerCase()) {
    case 'image/avif':
      return 'avif'
    case 'image/gif':
      return 'gif'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

export function safeFilename(filename: string) {
  const sanitized = filename
    .trim()
    .normalize('NFKD')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'image'
}

export function publicAssetPath(key: string) {
  return `/api/assets/${key.split('/').map(encodeURIComponent).join('/')}`
}
