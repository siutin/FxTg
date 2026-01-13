import crypto from 'crypto'
import path from 'path'
import {
    getEdgesFromScheduledServerJS,
    findThreadItemByPostId,
    getUserNameFromThreadItem,
    getAuthorNameFromThreadItem,
    getProfileImageURLFromThreadItem,
    getDescriptionFromThreadItem,
    getCreatedAtFromThreadItem,
    getStatusFromThreadItem,
    getMediaFromThreadItem
} from './threadEdges.js'

function cleanURL(url) {
    return url.replace(/\?(.+)/, '')
}

function generateFilename(url) {
    const extension = path.extname(cleanURL(url))
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8)
    return `${Date.now()}-${hash}${extension}`
}

async function evaluate(page,) {

    // await page.waitForSelector('[data-interactive-id]')

    const functionsCode = `
        ${getEdgesFromScheduledServerJS.toString()}
        ${findThreadItemByPostId.toString()}
        ${getUserNameFromThreadItem.toString()}
        ${getAuthorNameFromThreadItem.toString()}
        ${getProfileImageURLFromThreadItem.toString()}
        ${getDescriptionFromThreadItem.toString()}
        ${getCreatedAtFromThreadItem.toString()}
        ${getStatusFromThreadItem.toString()}
        ${getMediaFromThreadItem.toString()}
        `

    /*global document */
    return await page.evaluate((functionsCode) => {

        // Inject the functions
        try {
            eval(functionsCode)
        } catch (e) {
            console.error('Error injecting functions:', e)
            throw e
        }

        try {
            function extractDataFromTargetScripts(targetScripts) {
                if (targetScripts.length > 0) {
                    // https://www.threads.com/@<username>/post/<post_id>?xxxx=dddd
                    /*global window */
                    const postId = new URL(window.location.href).pathname.split('/').pop()
                    if (!postId) throw new Error(`postId not found. url: ${window.location.href}`)

                    const attempts = targetScripts.map(script => getEdgesFromScheduledServerJS(JSON.parse(script.textContent)))
                    if (!attempts) throw new Error('attempts not found')

                    const edges = attempts.find(attempt => attempt)
                    if (!edges) throw new Error('edges not found')

                    const threadItem = findThreadItemByPostId(edges, postId)
                    const userName = getUserNameFromThreadItem(threadItem)
                    const authorName = getAuthorNameFromThreadItem(threadItem)
                    const profileImageURL = getProfileImageURLFromThreadItem(threadItem)
                    const description = getDescriptionFromThreadItem(threadItem)
                    const createdAt = getCreatedAtFromThreadItem(threadItem)
                    const status = getStatusFromThreadItem(threadItem)
                    const parsedMedia = getMediaFromThreadItem(threadItem)
                    return {
                        description,
                        media: parsedMedia,
                        profileImageURL,
                        userName,
                        authorName,
                        createdAt,
                        status
                    }
                } else {

                    function getDescriptionText(div) {
                        const span = div.querySelector('div:nth-child(3)').querySelector('span')
                        if (!span) return null
                        span.childNodes.forEach(child => {
                            if (child.innerText == 'Translate') {
                                span.removeChild(child)
                            }
                        })
                        return span.innerText?.trim()
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

                }

            }

            return new Promise((resolve, reject) => {
                function waitForTargetScripts(n) {
                    const scripts = document.querySelectorAll('script[type="application/json"][data-sjs]')
                    const scheduledServerJSs = Array.from(scripts).filter(o => o.textContent?.includes('"ScheduledServerJS"'))
                    // const foundScript = scheduledServerJSs.find(o => o.textContent?.includes('thread_items'))

                    if (scheduledServerJSs) {
                        resolve(scheduledServerJSs)
                        return
                    }
                    if (n < 0) {
                        reject(new Error('targetScripts not found after maximum attempts'))
                        return
                    }

                    // Wait 10ms before next attempt
                    setTimeout(() => waitForTargetScripts(n - 1), 10)
                }
                waitForTargetScripts(300)
            })
                .then(foundScripts => {
                    return extractDataFromTargetScripts(foundScripts)
                })
                .catch(error => {
                    throw error
                })

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
    }, functionsCode)
}

function callback(evaluatedResult) {
    const { errorMessage, description, media, authorName, userName, profileImageURL, createdAt, status } = evaluatedResult

    if (errorMessage) throw new Error(errorMessage)

    const newMedia = media.map(o => {
        const filename = generateFilename(o.src)
        if (o.type === 'video') {
            return {
                filename,
                url: o.src,
                type: 'video'
            }
        } else {
            return {
                alt: o.alt,
                filename,
                url: o.src,
                type: o.type
            }
        }
    })

    const result = {
        requestUrl: '',
        description,
        userName,
        authorName,
        profileImageURL,
        createdAt,
        status,
        media: newMedia
    }
    return result
}

export default {
    evaluate,
    callback
}