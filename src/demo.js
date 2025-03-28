import path from 'path'
import axios from 'axios'
import { promises as fsPromises } from 'fs'
import { loadImage } from 'canvas'
import { Mosaic } from './mosaic.js'
import { loadWebpCanvas } from './webp.js'

// import { createCanvas } from 'canvas'
// import webp from '@cwasm/webp'
// export async function webpDemo1 (fileUrl) {
//   const source = await fsPromises.readFile(fileUrl)

//   const image = webp.decode(source)
//   console.log(image)

//   const canvas = createCanvas(768, 1024)
//   const ctx = canvas.getContext('2d')

//   const imageData = ctx.createImageData(image.width, image.height)

//   imageData.data.set(image.data)

//   ctx.putImageData(imageData, 0, 0)

//   await fsPromises.writeFile("./result.png", canvas.toBuffer())
// }

export async function webpDemo2() {

  const imageUrls = await (async function () {
    const file = await fsPromises.readFile('data/urls.txt', { encoding: 'utf8', flag: 'r' })
    return file.split('\n').map(s => s.trim())
  })()

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
              resolve(loadWebpCanvas(buffer))
            })
            .catch(reject)
        } else {
          resolve(loadWebpCanvas(s))
        }
      } else {
        resolve(loadImage(s))
      }
    })
  }
  const loadedImages = await Promise.all(imageUrls.map(url => customLoadImage(url)))
  console.log(loadedImages)

  const canvasWidth = 1024
  const mosaic = new Mosaic(loadedImages, canvasWidth)
  const canvas = mosaic.draw()
  await fsPromises.writeFile("./result.png", canvas.toBuffer())
}