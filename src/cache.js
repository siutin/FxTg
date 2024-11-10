import { promises as fsPromises } from 'fs'

export class ImageUrlsManager {
    constructor(filePath) {
        this.imageUrlsMap = {}
        this.filePath = filePath
        this.loadFromDisk()
    }

    async add(key, urls) {
        this.imageUrlsMap[key] = {
            urls,
            timestamp: Date.now()
        }
        return this.saveToDisk()
    }

    async loadFromDisk() {
        if (!(await fsPromises.stat(this.filePath).catch(() => false))) {
            throw new Error(`File ${this.filePath} not exists`)
        }
        const data = await fsPromises.readFile(this.filePath)
        Object.assign(this.imageUrlsMap, JSON.parse(data))
    }

    async saveToDisk() {
        await fsPromises.writeFile(this.filePath, JSON.stringify(this.imageUrlsMap))
    }

    async autoCleanUp(window = 1000 * 60 * 60, interval = 1000 * 60 * 60) {
        setInterval(async () => {
            console.log(`[${new Date().toISOString()}] cleaning imageUrlsMap: ${Object.keys(this.imageUrlsMap).length}`)
            // remove the image urls that are older than 1 hour         
            Object.keys(this.imageUrlsMap).forEach(key => {
                if (Date.now() - this.imageUrlsMap[key].timestamp > window) {
                    delete this.imageUrlsMap[key]
                }
            })
            await this.saveToDisk()
            console.log(`[${new Date().toISOString()}] imageUrlsMap after cleaning: ${Object.keys(this.imageUrlsMap).length}`)
        }, interval)
    }

    saveBeforeShutdown() {
        this.saveToDisk()
    }
}