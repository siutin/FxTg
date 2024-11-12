import winston from 'winston'

const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const duration = process.uptime() * 1000
    const durationDisplay = duration >= 1000
        ? `${(duration / 1000).toFixed(2)}s`
        : `${duration.toFixed(0)}ms`

    if (meta?.stack) {
        return `${timestamp} [${level}]: ${meta?.stack} (Duration: ${durationDisplay})`
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

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.errors({ stack: true }),
                winston.format.colorize(),
                winston.format.timestamp(),
                logFormat
            )
        })
    ]
})
