import crypto from 'crypto'
import path from 'path'

function cleanURL(url) {
    return url.replace(/\?(.+)/, '')
}

function generateFilename(url) {
    const extension = path.extname(cleanURL(url))
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8)
    return `${Date.now()}-${hash}${extension}`
}

async function evaluate(page) {

    await page.waitForSelector('[data-interactive-id]')

    /*global document */
    return await page.evaluate(() => {
        try {

            function getDescriptionText(div) {
                const span = div.querySelector('div:nth-child(3)').querySelector('span')
                if (!span) return null
                span.childNodes.forEach(child => {
                    if (child.nodeType != 3) {
                        span.removeChild(child)
                    }
                })
                return span.innerText
            }

            function getImages(div) {
                const images = div.querySelectorAll("img[height='100%'],picture > img")
                return Array.from(images).map(image => {
                    const video = image.nextElementSibling?.querySelector("video")
                    return {
                        src: image.src,
                        alt: image.alt,
                        type: video ? 'thumbnail' : 'photo'
                    }
                })
            }

            function getVideos(div) {
                const videos = div.querySelectorAll("video")
                return Array.from(videos).map(video => ({
                    src: video.src,
                    type: 'video'
                }))
            }

            function getCreatedAt(div) {
                const time = div.querySelector("time")
                return time ? time.dateTime : null
            }

            function getProfileImageURL(div) {
                const image = div.querySelector("img[alt$='profile picture']")
                return image ? image.src : null
            }

            function getUserName(document) {
                const head = document.querySelector("head")
                if (head) {
                    const content = head.querySelector("meta[property='og:title']")?.content
                    if (content) {
                        const matches = content.match(/\(([^)]+)\)/)
                        return matches ? matches[1] : null
                    }
                    return null
                }
            }

            function getAuthorName(document) {
                const head = document.querySelector("head")
                if (head) {
                    const content = head.querySelector("meta[property='og:title']")?.content
                    if (content) {
                        const splits = content.split(" ")
                        return splits.length > 0 ? splits[0] : null
                    }
                    return null
                }
            }

            function getStatus(div) {
                const likeElement = div.querySelector('svg[aria-label="Like"]')
                const likeCount = parseInt(likeElement?.nextElementSibling?.innerText) || 0

                const replyElement = div.querySelector('svg[aria-label="Reply"]')
                const replyCount = parseInt(replyElement?.nextElementSibling?.innerText) || 0

                const repostElement = div.querySelector('svg[aria-label="Repost"]')
                const repostCount = parseInt(repostElement?.nextElementSibling?.innerText) || 0

                const shareElement = div.querySelector('svg[aria-label="Share"]')
                const shareCount = parseInt(shareElement?.nextElementSibling?.innerText) || 0

                return { likeCount, replyCount, repostCount, shareCount }
            }

            // https://www.threads.net/?error=invalid_post
            function isInvalidPost(document) {
                const searchParams = new URLSearchParams(document.location.search)
                return searchParams.get('error') === 'invalid_post'
            }

            if (isInvalidPost(document)) {
                throw new Error('invalid post')
            }

            const divs = document.querySelectorAll('[data-interactive-id]')
            if (divs.length > 0) {
                const div = divs[0]
                const images = getImages(div)
                const videos = getVideos(div)
                const description = getDescriptionText(div)

                const authorName = getAuthorName(document)
                const userName = getUserName(document)
                const profileImageURL = getProfileImageURL(div)
                const createdAt = getCreatedAt(div)
                const status = getStatus(div)

                return {
                    description,
                    images,
                    videos,
                    userName,
                    authorName,
                    profileImageURL,
                    createdAt,
                    status
                }
            }
        } catch (ex) {
            return {
                errorMessage: ex.message,
                description: null,
                images: null,
                videos: null,
                userName: null,
                authorName: null,
                profileImageURL: null,
                createdAt: null,
                status: null
            }
        }
    })
}

function callback(evaluatedResult) {
    const { errorMessage, description, images, videos, authorName, userName, profileImageURL, createdAt, status } = evaluatedResult

    if (errorMessage) throw new Error(errorMessage)

    const media = []
    images.forEach(image => {
        media.push({
            alt: image.alt,
            filename: generateFilename(image.src),
            url: image.src,
            type: image.type
        })
    })

    videos.forEach(video => {
        media.push({
            filename: generateFilename(video.src),
            url: video.src,
            type: 'video'
        })
    })

    const result = {
        requestUrl: '',
        description,
        userName,
        authorName,
        profileImageURL,
        createdAt,
        status,
        media
    }
    return result
}

export default {
    evaluate,
    callback
}