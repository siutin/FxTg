import { Image } from 'canvas'
import { loadWebpCanvas } from './webp.js'
import path from 'path'
import axios from 'axios'

export async function loadImage(s) {
  const isUrl = s.startsWith('http://') || s.startsWith('https://')
  
  let extension
  if (isUrl) {
    const urlPath = new URL(s).pathname
    extension = path.extname(urlPath).toLowerCase()
  } else {
    extension = path.extname(s).toLowerCase()
  }

  if (extension === '.webp') {
    if (isUrl) {
      const response = await axios.get(s, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)
      return loadWebpCanvas(buffer)
    }
    return loadWebpCanvas(s)
  }
  
  const img = new Image()
  img.src = isUrl ? (await axios.get(s, { responseType: 'arraybuffer' })).data : s
  return img
}