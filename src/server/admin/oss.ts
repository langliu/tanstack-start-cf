import '@tanstack/react-start/server-only'

import { env } from 'cloudflare:workers'

const SIGNATURE_VERSION = 'OSS4-HMAC-SHA256'
const SERVICE = 'oss'
const REQUEST_TYPE = 'aliyun_v4_request'
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD'

type OssMethod = 'DELETE' | 'GET' | 'HEAD' | 'PUT'

type OssConfig = {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  endpoint: string
  region: string
}

export type OssPresignedRequest = {
  headers: Record<string, string>
  url: string
}

export async function createOssPresignedRequest(input: {
  expiresIn?: number
  headers?: Record<string, string>
  key: string
  method: OssMethod
  now?: Date
}) {
  const config = getOssConfig()
  const expiresIn = Math.min(Math.max(input.expiresIn ?? 600, 1), 604_800)
  const now = input.now ?? new Date()
  const date = formatDate(now)
  const dateTime = formatDateTime(now)
  const endpointUrl = getOssBucketEndpointUrl(config)
  const objectPath = encodeObjectPath(input.key)
  const canonicalUri = encodeCanonicalPath(`/${config.bucket}/${input.key}`)
  const headers = normalizeHeaders({
    host: endpointUrl.host,
    ...(input.headers ?? {}),
  })
  const additionalHeaders = additionalHeaderNames(headers).join(';')
  const credential = [
    config.accessKeyId,
    date,
    config.region,
    SERVICE,
    REQUEST_TYPE,
  ].join('/')
  const query = new Map<string, string>([
    ['x-oss-additional-headers', additionalHeaders],
    ['x-oss-credential', credential],
    ['x-oss-date', dateTime],
    ['x-oss-expires', String(expiresIn)],
    ['x-oss-signature-version', SIGNATURE_VERSION],
  ])
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQueryString(query),
    canonicalHeaders(headers),
    additionalHeaders,
    UNSIGNED_PAYLOAD,
  ].join('\n')
  const stringToSign = [
    SIGNATURE_VERSION,
    dateTime,
    `${date}/${config.region}/${SERVICE}/${REQUEST_TYPE}`,
    await sha256Hex(canonicalRequest),
  ].join('\n')
  const signingKey = await createSigningKey(config.accessKeySecret, {
    date,
    region: config.region,
  })
  const signature = await hmacHex(signingKey, stringToSign)
  query.set('x-oss-signature', signature)

  return {
    headers: stripHostHeader(headers),
    url: `${endpointUrl.origin}${objectPath}?${canonicalQueryString(query)}`,
  } satisfies OssPresignedRequest
}

export async function createOssSignedAssetUrl(input: {
  expiresIn?: number
  key: string
}) {
  const request = await createOssPresignedRequest({
    expiresIn: input.expiresIn ?? 3600,
    key: input.key,
    method: 'GET',
    now: roundedSigningTime(),
  })

  return request.url
}

export function publicOssAssetUrl(key: string) {
  const publicBaseUrl =
    getOptionalEnv('OSS_PUBLIC_BASE_URL') ?? getPublicBaseUrl()

  if (!publicBaseUrl) {
    return null
  }

  return `${publicBaseUrl.replace(/\/+$/g, '')}${encodeObjectPath(key)}`
}

function getPublicBaseUrl() {
  const bucket = getOptionalEnv('OSS_BUCKET')
  const region = getOptionalEnv('OSS_REGION')

  if (!bucket || !region) {
    return null
  }

  const endpoint = getOptionalEnv('OSS_ENDPOINT') ?? defaultEndpoint(region)
  return getBucketEndpointUrl({ bucket, endpoint }).origin
}

function getOssConfig() {
  const configuredRegion = getRequiredEnv('OSS_REGION')
  const region = signingRegion(configuredRegion)
  const bucket = getRequiredEnv('OSS_BUCKET')

  return {
    accessKeyId: getRequiredEnv('OSS_ACCESS_KEY_ID'),
    accessKeySecret: getRequiredEnv('OSS_ACCESS_KEY_SECRET'),
    bucket,
    endpoint:
      getOptionalEnv('OSS_ENDPOINT') ?? defaultEndpoint(configuredRegion),
    region,
  } satisfies OssConfig
}

function roundedSigningTime() {
  const date = new Date()
  const windowMs = 5 * 60 * 1000
  return new Date(Math.floor(date.getTime() / windowMs) * windowMs)
}

function signingRegion(region: string) {
  return region.startsWith('oss-') ? region.slice('oss-'.length) : region
}

function defaultEndpoint(region: string) {
  return region.startsWith('oss-')
    ? `https://${region}.aliyuncs.com`
    : `https://oss-${region}.aliyuncs.com`
}

function getOssBucketEndpointUrl(config: OssConfig) {
  return getBucketEndpointUrl({
    bucket: config.bucket,
    endpoint: config.endpoint,
  })
}

function getBucketEndpointUrl(input: { bucket: string; endpoint: string }) {
  const endpoint = input.endpoint.match(/^https?:\/\//)
    ? input.endpoint
    : `https://${input.endpoint}`
  const url = new URL(endpoint)

  if (!url.hostname.startsWith(`${input.bucket}.`)) {
    url.hostname = `${input.bucket}.${url.hostname}`
  }

  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url
}

function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name)

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function getOptionalEnv(name: string) {
  const value = (env as unknown as Record<string, string | undefined>)[name]
  return value?.trim() || null
}

function normalizeHeaders(headers: Record<string, string>) {
  const normalized: Record<string, string> = {}

  for (const [name, value] of Object.entries(headers)) {
    const trimmed = value.trim()
    if (trimmed) {
      normalized[name.toLowerCase()] = trimmed.replace(/\s+/g, ' ')
    }
  }

  return normalized
}

function stripHostHeader(headers: Record<string, string>) {
  const result = { ...headers }
  delete result.host
  return result
}

function additionalHeaderNames(headers: Record<string, string>) {
  return Object.keys(headers)
    .filter((name) => !isImplicitSignedHeader(name))
    .sort()
}

function isImplicitSignedHeader(name: string) {
  return name === 'content-type' || name === 'content-md5' || name.startsWith('x-oss-')
}

function canonicalHeaders(headers: Record<string, string>) {
  return Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value}\n`)
    .join('')
}

function canonicalQueryString(query: Map<string, string>) {
  return Array.from(query.entries())
    .map(([key, value]) => [uriEncode(key), uriEncode(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function encodeObjectPath(key: string) {
  return `/${encodeCanonicalPath(key)}`
}

function encodeCanonicalPath(path: string) {
  return path.split('/').map(uriEncode).join('/')
}

function uriEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

function formatDateTime(date: Date) {
  return `${formatDate(date)}T${date
    .toISOString()
    .slice(11, 19)
    .replaceAll(':', '')}Z`
}

async function createSigningKey(
  accessKeySecret: string,
  input: { date: string; region: string },
) {
  const dateKey = await hmacBytes(
    new TextEncoder().encode(`aliyun_v4${accessKeySecret}`),
    input.date,
  )
  const dateRegionKey = await hmacBytes(dateKey, input.region)
  const dateRegionServiceKey = await hmacBytes(dateRegionKey, SERVICE)
  return hmacBytes(dateRegionServiceKey, REQUEST_TYPE)
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return bytesToHex(new Uint8Array(digest))
}

async function hmacHex(key: Uint8Array, value: string) {
  return bytesToHex(await hmacBytes(key, value))
}

async function hmacBytes(key: Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(value),
  )
  return new Uint8Array(signature)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
