import puppeteer from 'puppeteer'
import crypto from 'crypto'
import path from 'path'

function cleanURL(url) {
    return url.replace(/\?(.+)/, '')
}

function generateFilename(url) {
    const extension = path.extname(cleanURL(url))
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8)
    return `${Date.now()}-${hash}${extension}`
}

export class Parser {
    constructor() {
        this.browser = null
    }

    async start() {
        this.browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=430x932'
            ]
        })
    }

    async close() {
        if (this.browser) {
            await this.browser.close()
            this.browser = null
        }
    }

    async parse(url) {
        const page = await this.browser.newPage()
        const customUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/564431005;FBDV/iPhone17,1;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5;FBRV/567052743]'
        await page.setUserAgent(customUA)
        try {

            // Navigate to page
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            })

            // Wait for network to be idle
            await page.waitForNetworkIdle({
                timeout: 5000,
                idleTime: 100
            })

            await page.waitForSelector('[data-interactive-id]')

            const files = new Set()

            const evaluatedResult = await page.evaluate(() => {
                try {

                    function getDescriptionText(div) {
                        const h1 = div.querySelector('h1')
                        if (!h1) return null
                        h1.childNodes.forEach(child => {
                            if (child.nodeType != 3) {
                                h1.removeChild(child)
                            }
                        })
                        return h1.innerText
                    }

                    function getPostImageURL(div) {
                        const multi = div.querySelector("picture img")
                        if (multi) return multi.src
                        const single = div.querySelector("img[height='100%']")
                        return single ? single.src : null
                    }

                    function getVideoImageURL(div) {
                        const video = div.querySelector("video")
                        return video ? video.src : null
                    }

                    const divs = document.querySelectorAll('[data-interactive-id]')
                    if (divs.length > 0) {
                        const div = divs[0]
                        const description = getDescriptionText(div)
                        const postImageURL = getPostImageURL(div)
                        const videoImageURL = getVideoImageURL(div)
                        return { description, postImageURL, videoImageURL }
                    }
                } catch (ex) {
                    console.error(ex)
                    return { description: null, postImageURL: null, videoImageURL: null }
                }
            })

            if (!evaluatedResult) throw new Error('failed to evaluate page')

            const { description, postImageURL, videoImageURL } = evaluatedResult

            if (postImageURL) {
                files.add({
                    filename: generateFilename(postImageURL),
                    originalUrl: postImageURL
                })
            }
            if (videoImageURL) {
                files.add({
                    filename: generateFilename(videoImageURL),
                    originalUrl: videoImageURL
                })
            }

            const result = {
                requestUrl: url,
                description,
                media: Array.from(files)
            }
            return result

        } catch (ex) {
            console.error(ex)
        } finally {
            await page.close()
        }
    }
}

if (process.env.url) {
    const parser = new Parser()
    await parser.start()
    const result = await parser.parse(process.env.url)
    console.log(result)
    await parser.close()
}