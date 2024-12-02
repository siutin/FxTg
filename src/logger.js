import winston from 'winston'
import 'winston-daily-rotate-file'
import { fileURLToPath } from 'url'
import path from 'path'
import { logLevel } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const logFormat = winston.format.printf(({ timestamp, level, message, duration = 0, ...meta }) => {
    const durationDisplay = duration >= 1000
        ? `${(duration / 1000).toFixed(2)}s`
        : `${duration.toFixed(0)}ms`

    if (meta?.stack) {
        return `${timestamp} [${level}]: ${message} (Duration: ${durationDisplay})\n${meta?.stack}`
    }

    const metaFormatter = (obj) => {
        const seen = new WeakSet()
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return
                }
                seen.add(value)
            }
            return value
        }, 2)
    }
    const additionalInfo = Object.keys(meta).length ? metaFormatter(meta) : ''
    return `${timestamp} [${level}]: ${message} ${additionalInfo} (Duration: ${durationDisplay})`
})

const createFileTransport = (level, filename) => {
    return new winston.transports.DailyRotateFile({
        filename: path.join(__dirname, '..', 'logs', filename),
        datePattern: 'YYYY-MM', // Rotate monthly
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '12 months',
        level: level,
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp(),
            logFormat
        )
    })
}

const transports = [
    new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.timestamp(),
            logFormat
        )
    }),
    createFileTransport('http', 'access-%DATE%.log'),
    createFileTransport('warn', 'alerts-%DATE%.log'),
    createFileTransport('debug', 'combined-%DATE%.log')
]

export const logger = winston.createLogger({
    level: 'silly',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        logFormat
    ),
    transports
})