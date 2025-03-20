import { loadImage } from 'canvas'
import { createCanvas } from 'canvas'
import fs from 'fs'
import webp from '@cwasm/webp'

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