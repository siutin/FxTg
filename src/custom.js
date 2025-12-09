import { Image } from 'canvas'
import { loadWebpCanvas } from './webp.js'
import path from 'path'
import axios from 'axios'
import { promises as fs } from 'fs'

const DEFAULT_HEADERS = {
  // simulate a real browser
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
}

function isUrl(source) {
  return source.startsWith('http://') || source.startsWith('https://')
}

async function fetchBuffer(source, { timeoutMs = 10_000 } = {}) {
  if (!isUrl(source)) {
    const buffer = await fs.readFile(source)
    return { buffer, contentType: null }
  }

  const response = await axios.get(source, {
    responseType: 'arraybuffer',
    headers: DEFAULT_HEADERS,
    maxRedirects: 5,
    timeout: timeoutMs,
    validateStatus: status => status >= 200 && status < 400
  })

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || null
  }
}

export async function loadImage(source) {
  let extension
  if (isUrl(source)) {
    const urlPath = new URL(source).pathname
    extension = path.extname(urlPath).toLowerCase()
  } else {
    extension = path.extname(source).toLowerCase()
  }

  try {
    const { buffer, contentType } = await fetchBuffer(source)
    const isWebp = extension === '.webp' || (contentType ?? '').includes('image/webp')

    if (isWebp) {
      return loadWebpCanvas(buffer)
    }

    const img = new Image()
    img.src = buffer
    return img
  } catch (error) {
    const reason = error?.message || 'unknown error'
    throw new Error(`Failed to load image '${source}': ${reason}`)
  }
}