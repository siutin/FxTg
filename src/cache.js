import { promises as fsPromises } from 'fs'
import { logger } from './logger.js'

export class Cache {
    constructor(filePath) {
        this.map = {}
        this.filePath = filePath
        this.load()
    }

    getValue(key) {
        return this.map[key]?.value
    }

    getTimestamp(key) {
        return this.map[key]?.timestamp
    }

    async add(key, value) {
        this.map[key] = {
            value,
            timestamp: Date.now()
        }
        return this.save()
    }

    async load() {
        try {
            await fsPromises.stat(this.filePath)
            const data = await fsPromises.readFile(this.filePath)
            Object.assign(this.map, JSON.parse(data))
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.log('warn', `File ${this.filePath} does not exist. Initializing empty map.`)
            } else {
                throw error
            }
        }
    }

    async save() {
        await fsPromises.writeFile(this.filePath, JSON.stringify(this.map))
    }

    async autoCleanUp(window = 1000 * 60 * 60, interval = 1000 * 60 * 60) {
        setInterval(async () => {
            logger.log('info', `[${new Date().toISOString()}] ${this.constructor.name} Cleaning: ${Object.keys(this.map).length}`)
            // Remove image URLs older than the specified window
            Object.keys(this.map).forEach(key => {
                if (Date.now() - this.getTimestamp(key) > window) {
                    delete this.map[key]
                }
            })
            await this.save()
            logger.log('info', `[${new Date().toISOString()}] ${this.constructor.name} after cleaning: ${Object.keys(this.map).length}`)
        }, interval)
    }
}