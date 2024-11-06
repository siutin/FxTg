import express from 'express'
import axios from 'axios'
import path from 'path'
import { parse } from './parser.js'

const app = express()
const port = process.env.PORT || 3000
const base_url = process.env.BASE_URL || `http://localhost:${port}`

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'))
})

app.get('/media_download', async (req, res) => {
    const url = req.query.url
    console.log(`url: ${url}`)
    const fileUrl = Buffer.from(url, 'base64').toString()
    console.log(`fileUrl: ${fileUrl}`)

    const customUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/564431005;FBDV/iPhone17,1;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5;FBRV/567052743]'
    try {
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
        res.on('error', (err) => {
            console.error('Stream error:', err)
            if (!res.headersSent) {
                res.status(500).send('Error streaming file')
            }
        })

    } catch (error) {
        console.error('Download error:', error)
        if (!res.headersSent) {
            res.status(500).send('Error downloading file')
        }
    }
})

function generateRandomIdentifier() {
    const timestamp = Date.now()

    const random = Math.floor(Math.random() * 1000)

    return `${timestamp}${random.toString().padStart(3, "0")}`
}

app.get('/:username/post/:postId', async (req, res) => {
    try {

        const { username, postId } = req.params
        const threadsUrl = `https://www.threads.net/${username}/post/${postId}`

        const userAgent = req.headers['user-agent']
        console.log(`User Agent: ${userAgent}\n`)

        if (!userAgent.includes('Telegram')) {
            return res.status(301).redirect(threadsUrl)
        }

        const data = await parse(threadsUrl)
        console.log('parsed data:', data)

        const { requestUrl, description, media } = data

        const imageUrl = media.filter(o => path.extname(o.filename).includes('jpg'))[0]?.originalUrl
        console.log(`imageUrl: ${imageUrl}\n`)

        const videoOriginalUrl = media.filter(o => path.extname(o.filename).includes('mp4'))[0].originalUrl
        console.log(`videoOriginalUrl: ${videoOriginalUrl}\n`)

        const videoEncodedPath = Buffer.from(videoOriginalUrl).toString('base64')
        const videoEncodedUrl = `${base_url}/media_download?t=${generateRandomIdentifier()}&url=${videoEncodedPath}&n=0.mp4`
        console.log(`videoEncodedUrl: ${videoEncodedUrl}\n`)

        const external = {
            url: videoEncodedUrl,
            thumbnailUrl: imageUrl,
            format: 'mp4',
            width: 320,
            height: 320
        }

        const newHtml = `
    <html>
    <head>
        <meta property="og:title" content="Thread from ${username}"/>
        <meta name="twitter:description" content="${description}">
        <meta property="og:url" content="${threadsUrl}"/>
        <meta property="twitter:player" content="${external.url}">
        <meta property="twitter:player:stream" content="${external.url}"/>
        <meta property="twitter:player:stream:content_type" content="${external.format}"/>
        <meta property="twitter:player:width" content="${external.width}">
        <meta property="twitter:player:height" content="${external.height}">
        <meta property="og:type" content="video.other">
        <meta property="og:video:url" content="${external.url}">
        <meta property="og:video:secure_url" content="${external.url}">
        <meta property="og:video:width" content="${external.width}">
        <meta property="og:video:height" content="${external.height}">
        <meta property="og:image" content="${external.thumbnailUrl}">
    </head>
    </html>
    `
        res.send(newHtml)

    } catch (error) {
        console.error('Error:', error)
        res.status(500).send('Error fetching thread')
    }
})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
});