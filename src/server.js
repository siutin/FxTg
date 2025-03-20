import express from 'express'
import axios from 'axios'
import path from 'path'
import { port, baseUrl, cacheFilePath, browserOptionsPath, whitelistVideoHostRegex } from './config.js'
import { logger } from './logger.js'
import loader from './loader.js'
import { Parser } from './parser.js'
import render from './renderer.js'
// import { loadImage } from 'canvas'
import { Mosaic } from './mosaic.js'
import { Cache } from './cache.js'
import { loadImage } from './custom.js'

const cache = new Cache(cacheFilePath)
cache.autoCleanUp()

const parser = new Parser({ browserOptions: loader.browserOptions(browserOptionsPath) })
parser.start()

process.on('SIGINT', () => {
    parser.close()
    process.exit(0)
})

const app = express()

app.use(express.static('public'))

// middleware to measure duration
app.use((req, res, next) => {
    const start = process.hrtime()
    const originalLog = logger.log.bind(logger)
    logger.log = (level, message, ...meta) => {
        const duration = process.hrtime(start)
        const durationInMs = (duration[0] * 1e3 + duration[1] / 1e6).toFixed(2)
        originalLog(level, message, { duration: Number(durationInMs), ...meta[0] })
    }
    next()
})

// middleware to handle request logging
app.use((req, res, next) => {
    req.requestId = generateRandomIdentifier()
    req.requestIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    res.on('finish', () => logger.log('http', `[${req.requestIp}][${req.requestId}] ${res.statusCode} ${req.originalUrl}`))
    next()
})

function encodeVideoURL2Params(value) {
    const url = new URL(value)
    let params = new URLSearchParams(url.search)
    params.append("___host", url.host)
    params.append("___pathname", url.pathname)
    return params
}

function decodeVideoURL(value) {
    const url = new URL(value)
    const host = url.searchParams.get('___host')
    const pathname = url.searchParams.get('___pathname')
    let params = new URLSearchParams(url.searchParams)
    params.delete('___host')
    params.delete('___pathname')
    params.delete('___t')
    params.delete('0.mp4')
    logger.log('debug', `host: ${host} pathname: ${pathname} params: ${params}`)

    if (!host || !pathname || params.length === 0)
        throw new Error('invalid url')

    return { host, pathname, params }
}

function generateRandomIdentifier(digits = 6) {
    const random = Math.floor(Math.random() * 1000)
    return `${random.toString().padStart(digits, "0")}`
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'))
})

app.get('/mosaic/:username/post/:postId', async (req, res) => {

    const { username, postId } = req.params

    const imageUrls = cache.getValue(`${username}|${postId}`) || []
    if (imageUrls.length === 0) {
        return res.status(404).send('image urls found')
    }

    const canvasWidth = 1024
    try {
        // Load all images first
        const loadedImages = await Promise.all(imageUrls.map(url => loadImage(url)))
        logger.log('debug', `Loaded images: ${loadedImages.length}`)

        const mosaic = new Mosaic(loadedImages, canvasWidth)
        const canvas = mosaic.draw()

        // Send response
        res.setHeader('Content-Type', 'image/png')
        const buffer = canvas.toBuffer('image/png')
        res.send(buffer)

    } catch (error) {
        logger.log('error', `Error creating mosaic: ${error}`, { stack: error?.stack })
        res.status(500).send('Error creating mosaic')
    }
})

app.get('/media_download', async (req, res) => {
    try {
        if (req.query.length === 0) {
            res.status(404).send('File not found')
            return
        }

        const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
        logger.log('debug', `fullUrl: ${fullUrl}`)

        const { host, pathname, params } = decodeVideoURL(fullUrl)
        const fileUrl = `https://${host}${pathname}?${params.toString()}`
        logger.log('debug', `fileUrl: ${fileUrl}`)

        if (!whitelistVideoHostRegex.test(host)) {
            logger.log('warn', `host '${host}' is not in whitelist. fullUrl: ${fullUrl}`)
            res.status(400).send('bad request')
            return
        }

        const customUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/564431005;FBDV/iPhone17,1;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5;FBRV/567052743]'

        const headResponse = await axios({
            method: 'head',
            url: fileUrl,
            headers: {
                'User-Agent': customUA
            }
        })

        const contentLength = parseInt(headResponse.headers['content-length'])
        const contentType = headResponse.headers['content-type']

        // Parse Range header
        const range = req.headers.range
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1
            const chunksize = (end - start) + 1

            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'stream',
                headers: {
                    'Range': `bytes=${start}-${end}`,
                    'User-Agent': customUA
                }
            })

            // Set partial content headers
            res.status(206)
            res.set({
                'Content-Range': `bytes ${start}-${end}/${contentLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType
            })

            response.data.pipe(res)
        } else {
            // Full content request
            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': customUA
                }
            })

            res.set({
                'Content-Length': contentLength,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes'
            })

            response.data.pipe(res)
        }

        // Handle streaming errors
        res.on('error', (error) => {
            logger.log('error', `Media streaming error: ${error} `, { stack: error?.stack })
            if (!res.headersSent) {
                res.status(500).send('Error streaming file')
            }
        })

    } catch (error) {
        logger.log('error', `Media download error: ${error}`, { stack: error?.stack })
        if (!res.headersSent) {
            res.status(500).send('Error downloading file')
        }
    }
})

async function threadsHandler(req, res) {
    try {
        const { username, postId } = req.params
        const threadsUrl = username ? `https://www.threads.net/${username}/post/${postId}` : `https://www.threads.net/post/${postId}`
        const imgIndex = /^\d+$/.test(req.query.img_index) ? parseInt(req.query.img_index) : null

        const userAgent = req.headers['user-agent']
        logger.log('debug', `User Agent: ${userAgent}`)

        if (!userAgent.includes('Telegram')) {
            return res.status(301).redirect(threadsUrl)
        }

        const data = await parser.parse(threadsUrl)
        logger.log('debug', 'parsed data:', { data })

        // eslint-disable-next-line no-unused-vars
        const { requestUrl, description, media, authorName, userName, profileImageURL, createdAt, status } = data

        const images = media.filter(o => o.type === 'photo' || o.type === 'thumbnail')
        logger.log('debug', 'images:', { images })

        const videos = media.filter(o => o.type === 'video')
        logger.log('debug', 'videos:', { videos })

        // validate imgIndex
        const mediaIndex = (imgIndex < 1 || imgIndex > images.length) ? null : imgIndex - 1

        let renderData = {
            serviceName: 'threads',
            url: threadsUrl,
            mosaicUrl: `${baseUrl}/mosaic/${username}/post/${postId}`,
            mediaIndex,
            authorName,
            username: username || userName,
            description: (description?.trim()?.length > 0 ? description : images.filter(o => o.type === 'photo')[0]?.alt) || "",
            createdAt,
            profileImageURL,
            images,
            videos: [],
            hasImage: images.filter(o => o.type === 'photo').length > 0,
            hasVideo: videos.length > 0,
            status: status || {}
        }

        videos.forEach((video, index) => {
            let newParams = encodeVideoURL2Params(video.url)
            newParams.append("___t", generateRandomIdentifier())
            const videoEncodedUrl = `${baseUrl}/media_download?${newParams.toString()}&0.mp4`
            logger.log('debug', `[${index + 1}] videoEncodedUrl: ${videoEncodedUrl}`)
            renderData.videos.push({
                url: videoEncodedUrl,
                format: 'mp4',
                width: 320,
                height: 320
            })
        })

        cache.add(`${username}|${postId}`, images.map(o => o.url))

        const html = render(renderData)
        res.send(html)
    } catch (error) {
        logger.log('error', `[threads] ${error}`, { stack: error?.stack })
        res.status(500).send('Error fetching thread')
    }
}

async function instagramHandler(req, res) {
    try {

        const { username, type, postId } = req.params
        const postUrl = username ? `https://www.instagram.com/${username}/${type}/${postId}` : `https://www.instagram.com/${type}/${postId}`
        const imgIndex = /^\d+$/.test(req.query.img_index) ? parseInt(req.query.img_index) : null

        const userAgent = req.headers['user-agent']
        logger.log('debug', `User Agent: ${userAgent}`)

        if (!userAgent.includes('Telegram')) {
            return res.status(301).redirect(postUrl)
        }

        const data = await parser.parse(postUrl)
        logger.log('debug', 'parsed data:', { data })

        // eslint-disable-next-line no-unused-vars
        const { requestUrl, description, media, authorName, userName, profileImageURL, createdAt, status } = data

        const images = media.filter(o => o.type === 'photo' || o.type === 'thumbnail')
        logger.log('debug', 'images:', { images })

        const videos = media.filter(o => o.type === 'video')
        logger.log('debug', 'videos:', { videos })

        // validate imgIndex
        const mediaIndex = (imgIndex < 1 || imgIndex > images.length) ? null : imgIndex - 1

        let renderData = {
            serviceName: 'instagram',
            url: postUrl,
            mosaicUrl: `${baseUrl}/mosaic/${userName}/post/${postId}`,
            mediaIndex,
            authorName,
            username: username || userName,
            description: (description?.trim()?.length > 0 ? description : images.filter(o => o.type === 'photo')[0]?.alt) || "",
            createdAt,
            profileImageURL,
            images,
            videos: [],
            hasImage: images.filter(o => o.type === 'photo').length > 0,
            hasVideo: videos.length > 0,
            status: status || {}
        }

        videos.forEach((video, index) => {
            let newParams = encodeVideoURL2Params(video.url)
            newParams.append("___t", generateRandomIdentifier())
            const videoEncodedUrl = `${baseUrl}/media_download?${newParams.toString()}&0.mp4`
            logger.log('debug', `[${index + 1}] videoEncodedUrl: ${videoEncodedUrl}`)
            renderData.videos.push({
                url: videoEncodedUrl,
                format: 'mp4',
                width: 320,
                height: 320
            })
        })

        cache.add(`${userName}|${postId}`, images.map(o => o.url))

        const html = render(renderData)
        res.send(html)
    } catch (error) {
        logger.log('error', `[instagram] ${error}`, { stack: error?.stack })
        res.status(500).send('Error fetching thread')
    }
}

app.get('/threads/:username/post/:postId', threadsHandler)
app.get('/threads/post/:postId', threadsHandler)

app.get('/instagram/:username/:type(p|reel)/:postId', instagramHandler)
app.get('/instagram/:type(p|reel)/:postId', instagramHandler)

app.get('/instagram/stories/:username/:postId', (req, res) => {
    logger.log('info', `instagram stories. ${req.url}`)
    const { username, postId } = req.params
    const postUrl = `https://www.instagram.com/stories/${username}/${postId}`

    const userAgent = req.headers['user-agent']
    logger.log('debug', `User Agent: ${userAgent}`)

    if (!userAgent.includes('Telegram')) {
        return res.status(301).redirect(postUrl)
    }

    const hackUrl = `https://www.ddinstagram.com/stories/${username}/${postId}`
    return res.status(301).redirect(hackUrl)
})

app.get('*', (req, res) => {
    res.status(404).send('not found')
})

// Start the server
app.listen(port, () => {
    logger.log('info', `Server running at http://localhost:${port}`)
})