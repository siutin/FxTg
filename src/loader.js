import fs from 'fs'
import { logger } from './logger.js'

function browserOptions(path) {
    try {
        fs.accessSync(path)
        logger.log('debug', `load browserOptions from '${path}'`)
        return JSON.parse(fs.readFileSync(path, 'utf-8'))
    } catch (ex) {
        logger.log('error', `load loadBrowserOptions error: ${ex}`)
    }
}

export default {
    browserOptions
}