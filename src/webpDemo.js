import path from 'path'
import axios from 'axios'
import { promises as fsPromises } from 'fs'
import { loadImage } from 'canvas'
import { Mosaic } from './mosaic.js'
import { loadWebpImage } from './webp.js'

// function demo (fileUrl) {
//   const source = fs.readFileSync(fileUrl)

//   const image = webp.decode(source)
//   console.log(image)

//   const canvas = createCanvas(768, 1024)
//   const ctx = canvas.getContext('2d')

//   const imageData = ctx.createImageData(image.width, image.height)

//   imageData.data.set(image.data)

//   ctx.putImageData(imageData, 0, 0)

//   fs.writeFileSync("./result.png", canvas.toBuffer())
// }

async function demo2 () {

  const imageUrls = await (async function() {
    const file = await fsPromises.readFile('data/urls.txt', { encoding: 'utf8', flag: 'r' })
    return file.split('\n').map(s=> s.trim())
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
  const loadedImages = await Promise.all(imageUrls.map(url => customLoadImage(url)))
  console.log(loadedImages)

  const canvasWidth = 1024
  const mosaic = new Mosaic(loadedImages, canvasWidth)
  const canvas = mosaic.draw()
  await fsPromises.writeFile("./result.png", canvas.toBuffer())
}

demo2()
