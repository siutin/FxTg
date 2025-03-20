import { loadImage as canvasLoadImage } from 'canvas'
import { loadWebpImage } from './webp.js'
import path from 'path'
import axios from 'axios'

export function loadImage(s) {
  return new Promise((resolve, reject) => {
    const isUrl = s.startsWith('http://') || s.startsWith('https://')

    let extension
    if (isUrl) {
      const urlPath = new URL(s).pathname
      extension = path.extname(urlPath).toLowerCase()
    } else {
      extension = path.extname(s).toLowerCase()
    }

    if (extension == '.webp') {
      if (isUrl) {
        axios.get(s, { responseType: 'arraybuffer' })
          .then(response => {
            const buffer = Buffer.from(response.data)
            resolve(loadWebpImage(buffer))
          })
          .catch(reject)
      } else {
        resolve(loadWebpImage(s))
      }
    } else {
      resolve(canvasLoadImage(s))
    }
  })
}