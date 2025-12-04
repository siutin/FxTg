import path from 'path'
import axios from 'axios'
import fs from 'fs'
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

async function parseScheduleServerJS(script) {

  function getFileNameFromUrl(url) {
    const urlPath = new URL(url).pathname
    return path.basename(urlPath).toLowerCase()
  }

  const relayPrefetchedStreamCache = script?.["require"]?.[0]?.[3]?.[0]?.["__bbox"]?.["require"]?.[0]
  const rolarisPostRootQueryRelayPreloader__result__data = relayPrefetchedStreamCache?.[3]?.[1]?.["__bbox"]?.["result"]?.["data"]
  const xdtApiV1MediaShortcodeWebInfo = rolarisPostRootQueryRelayPreloader__result__data?.["xdt_api__v1__media__shortcode__web_info"]
  const carousel_media = xdtApiV1MediaShortcodeWebInfo?.["items"]?.[0]?.["carousel_media"]
  const parsed = carousel_media.map(o => {
    const images = o["image_versions2"]["candidates"]
    const largestImage = images.sort((a, b) => b.height - a.height)[0]
    return {
      code: o.code,
      pk: o.pk,
      id: o.id,
      image: {
        url: largestImage.url,
        filename: getFileNameFromUrl(largestImage.url),
        height: largestImage.height,
        width: largestImage.width
      }
    }
  })
  return parsed
}

export async function loadScheduledServerJSDemo(filePath) {
  const file = await fsPromises.readFile(filePath, { encoding: 'utf8', flag: 'r' })
  const script = JSON.parse(file)
  const parsed = await parseScheduleServerJS(script)
  console.dir(parsed, { depth: null })
  return parsed
}

export async function saveScheduledServerJSDemo(filePath) {
  console.log("saveScheduledServerJSDemo start")
  console.log(`filePath: ${filePath}`)

  const file = await fsPromises.readFile(filePath, { encoding: 'utf8', flag: 'r' })
  const script = JSON.parse(file)
  const parsed = await parseScheduleServerJS(script)
  console.log(`parsed: ${parsed.length}`)

  const outputsFolder = path.join(process.cwd(), 'outputs')
  console.log(`outputsFolder: ${outputsFolder}`)
  if (!fs.existsSync(outputsFolder)) {
    fs.mkdirSync(outputsFolder, { recursive: true })
  }

  for (let i = 0; i < parsed.length; i++) {
    const o = parsed[i]
    console.log(`[${i}/${parsed.length}] code: ${o.code} id: ${o.id} pk: ${o.pk}`)
    const imageUrl = o.image.url
    const largestImagePath = path.join(outputsFolder, `${o.code}_${o.id}_${o.image.filename}`)
    console.log(`[${i}/${parsed.length}] imageUrl: ${imageUrl}`)
    console.log(`[${i}/${parsed.length}] largestImagePath: ${largestImagePath}`)
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    console.log(`[${i}/${parsed.length}] response: ${response.data.length}`)
    await fs.promises.writeFile(largestImagePath, Buffer.from(response.data))
  }
}

// saveScheduledServerJSDemo('scheduledServerJSScripts/demo1.json').then(() => {
//   console.log('saveScheduledServerJSDemo done')
// })

// loadScheduledServerJSDemo('scheduledServerJSScripts/demo1.json').then(async (parsed) => {
//   console.dir(parsed, { depth: null })
// })