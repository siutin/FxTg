import puppeteer from 'puppeteer'
import { logger } from './logger.js'
import threads from './parsers/threads.js'
import instagram from './parsers/instagram.js'
import fs from 'fs'

export class Parser {
    constructor({ browserOptions = {} } = {}) {
        this.browser = null
        this.browserOptions = browserOptions
    }

    async start() {
        if (this.browser) return
        logger.log('debug', `[${this.constructor.name}] Starting browser...`)
        logger.log('debug', `[${this.constructor.name}]`, { browserOptions: this.browserOptions })
        this.browser = await puppeteer.launch(this.browserOptions)
        logger.log('debug', `[${this.constructor.name}] Browser started`)
    }

    async close() {
        if (this.browser) {
            await this.browser.close()
            this.browser = null
            logger.log('debug', `[${this.constructor.name}] Browser closed`)
        }
    }

    async parse(url) {
        logger.log('debug', `[${this.constructor.name}] Parsing ${url}...`)

        const page = await this.browser.newPage()
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

            if (url.startsWith('https://www.instagram.com')) {
                const evaluatedResult = await instagram.evaluate(page)

                const html = await page.content()
                fs.writeFileSync(`./html/${new Date().toISOString().replace(/[\.\-T:Z]/g,'')}.html`, html)

                if (!evaluatedResult) throw new Error('failed to evaluate page')
                return instagram.callback(evaluatedResult)
            } else if (url.startsWith('https://www.threads.net')) {
                const evaluatedResult = await threads.evaluate(page)
                if (!evaluatedResult) throw new Error('failed to evaluate page')
                return threads.callback(evaluatedResult)
            }
        } catch (error) {
            logger.log('error', error, { stack: error?.stack })
            await page.screenshot({path: `./public/pics/${new Date().toISOString().replace(/[\.\-T:Z]/g,'')}.png`, fullPage: true})
        } finally {
            await page.close()
            logger.log('debug', `[${this.constructor.name}] Page closed`)
        }
    }
}

if (process.env.url) {
    const parser = new Parser()
    await parser.start()
    const result = await parser.parse(process.env.url)
    logger.log('info', result)
    await parser.close()
}