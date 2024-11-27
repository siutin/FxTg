import fs from 'fs'
import { logger } from './logger.js'

const logLevel = process.env.LOG_LEVEL || 'http'

function loadBrowserOptions(path) {
    try {
        fs.accessSync(path)
        logger.log('debug', `load browserOptions from '${path}'`)
        return JSON.parse(fs.readFileSync(path, 'utf-8'))
    } catch (ex) {
        logger.log('error', `load loadBrowserOptions error: ${ex}`)
    }
}

export { logLevel, loadBrowserOptions }