import { loadImage } from 'canvas'
import { createCanvas } from 'canvas'
import fs from 'fs'
import webp from '@cwasm/webp'
import path from 'path'
import axios from 'axios'
import { Mosaic } from './mosaic.js'

function demo (fileUrl) {
  const source = fs.readFileSync(fileUrl)

  const image = webp.decode(source)
  console.log(image)

  const canvas = createCanvas(768, 1024)
  const ctx = canvas.getContext('2d')

  const imageData = ctx.createImageData(image.width, image.height)

  imageData.data.set(image.data)

  ctx.putImageData(imageData, 0, 0)

  fs.writeFileSync("./result.png", canvas.toBuffer())
}

const imageUrls = (function() {
  const file = fs.readFileSync('data/urls.txt', { encoding: 'utf8', flag: 'r' })
  return file.split('\n').map(s=> s.trim())
})();

console.log(`imageUrls: ${imageUrls}`)

function customLoadImage(s) {
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
      resolve(loadImage(s))
    }
  })
}

function loadWebpImage(sourceOrBuffer) {
  const source = Buffer.isBuffer(sourceOrBuffer) 
    ? sourceOrBuffer 
    : fs.readFileSync(sourceOrBuffer)
  const image = webp.decode(source)
  // console.log(image)

  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(image.width, image.height)
  imageData.data.set(image.data)
  ctx.putImageData(imageData, 0, 0)
  return loadImage(canvas.toBuffer("image/png"))
}

const loadedImages = await Promise.all(imageUrls.map(url => customLoadImage(url)))
console.log(loadedImages)

const canvasWidth = 1024
const mosaic = new Mosaic(loadedImages, canvasWidth)
const canvas = mosaic.draw()
fs.writeFileSync("./result.png", canvas.toBuffer())