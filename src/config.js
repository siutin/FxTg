const packageName = process.env.PACKAGE_NAME || 'FxTG'
const logLevel = process.env.LOG_LEVEL || 'http'
const port = process.env.PORT || 3000
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`
const cacheFilePath = process.env.CACHE_FILE_PATH || './cache.json'
const browserOptionsPath = process.env.BROWSER_OPTIONS_PATH || 'config/browserOptions.json'
const whitelistVideoHosts = [
    '([a-zA-Z0-9-]+)\\.cdninstagram\\.com',
    'instagram\\.([a-zA-Z0-9-]+)\\.fna\\.fbcdn\\.net',
]
const whitelistVideoHostRegex = new RegExp(`^(${whitelistVideoHosts.join('|')})$`)

export {
    packageName,
    logLevel,
    port,
    baseUrl,
    cacheFilePath,
    browserOptionsPath,
    whitelistVideoHostRegex
}