import { loadImage } from 'canvas'
import { createCanvas } from 'canvas'
import { promises as fsPromises } from 'fs'
import webp from '@cwasm/webp'

export async function loadWebpImage(sourceOrBuffer) {
  const source = Buffer.isBuffer(sourceOrBuffer)
    ? sourceOrBuffer
    : await fsPromises.readFile(sourceOrBuffer)

  const image = webp.decode(source)
  // console.log(image)

  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(image.width, image.height)
  imageData.data.set(image.data)
  ctx.putImageData(imageData, 0, 0)
  return loadImage(canvas.toBuffer("image/png"))
}