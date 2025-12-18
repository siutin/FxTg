import crypto from 'crypto'
import path from 'path'
import {
    getWebInfoFromScheduledServerJS,
    getMediaFromWebInfo,
    getProfileImageURLFromWebInfo,
    getUserNameFromWebInfo,
    getDescriptionFromWebInfo,
    getStatusFromWebInfo,
    getCreatedAtFromWebInfo
} from './instagramWebInfo.js'

function cleanURL(url) {
    return url.replace(/\?(.+)/, '')
}

function generateFilename(url) {
    const extension = path.extname(cleanURL(url))
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8)
    return `${Date.now()}-${hash}${extension}`
}

async function evaluate(page) {
    // Wait for selectors with reasonable timeouts
    // Wait for main and script in parallel since they don't depend on each other
    await Promise.all([
        page.waitForSelector('main', { timeout: 10000 }),
        page.waitForSelector('script[type="application/json"][data-sjs]', { timeout: 10000 })
    ])
    
    // Wait for presentation element (depends on main being loaded)
    await page.waitForSelector('main [role="presentation"]', { timeout: 5000 })

    // Inject extracted functions into browser context
    // Use Function.prototype.toString to ensure proper serialization
    const functionsCode = `
        ${getWebInfoFromScheduledServerJS.toString()}
        ${getMediaFromWebInfo.toString()}
        ${getProfileImageURLFromWebInfo.toString()}
        ${getUserNameFromWebInfo.toString()}
        ${getDescriptionFromWebInfo.toString()}
        ${getStatusFromWebInfo.toString()}
        ${getCreatedAtFromWebInfo.toString()}
    `

    /*global document*/
    return await page.evaluate((functionsCode) => {
        // Inject the functions
        try {
            eval(functionsCode)
        } catch (e) {
            console.error('Error injecting functions:', e)
            throw e
        }

        try {

            // selector script[type="application/json"][data-sjs]
            const scripts = document.querySelectorAll('script[type="application/json"][data-sjs]')
            const scheduledServerJSs = Array.from(scripts).map(o => o.text).filter(o => o.contains('"ScheduledServerJS"'))
            const targetScript = scheduledServerJSs.find(o => o.contains('xdt_api__v1__media__shortcode__web_info'))

            if (targetScript) {
                const webInfo = getWebInfoFromScheduledServerJS(JSON.parse(targetScript))
                const parsedMedia = getMediaFromWebInfo(webInfo)
                const ssProfileImageURL = getProfileImageURLFromWebInfo(webInfo)
                const ssUserName = getUserNameFromWebInfo(webInfo)
                const ssDescription = getDescriptionFromWebInfo(webInfo)
                const ssCreatedAt = getCreatedAtFromWebInfo(webInfo)
                const ssStatus = getStatusFromWebInfo(webInfo)
                return {
                    description: ssDescription,
                    media: parsedMedia,
                    profileImageURL: ssProfileImageURL || '',
                    userName: ssUserName,
                    authorName: ssUserName,
                    createdAt: ssCreatedAt,
                    status: ssStatus
                }
            } else {
                const main = document.querySelector('main')

                if (main) {

                    function getImages(article) {
                        const imgs = article.querySelectorAll("div[role='presentation'] img")
                        return Array.from(imgs).map(img => {
                            return {
                                src: img.src,
                                alt: img.alt,
                                width: img.width,
                                height: img.height,
                                type: 'photo'
                            }
                        })
                    }

                    function getProfileImageURL(article) {
                        const header = article.querySelector("header")
                        return header?.querySelector("img")?.src
                    }

                    function getUserName(document) {
                        const head = document.querySelector("head")
                        if (head) {
                            const content = head.querySelector("meta[name='twitter:title']")?.content
                            if (content) {
                                const s = content.substr(0, content.lastIndexOf('•') - 1)
                                const matches = s.match(/\(([^)]+)\)/)
                                return matches ? matches[1].replace("@", '') : null
                            }
                            return null
                        }
                    }

                    function getAuthorName(document) {
                        const head = document.querySelector("head")
                        if (head) {
                            const content = head.querySelector("meta[name='twitter:title']")?.content
                            if (content) {
                                const s = content.substr(0, content.lastIndexOf('•') - 1)
                                const ss = `${s.substr(0, s.lastIndexOf("@") - 2)}`.trim()
                                if (ss.length > 0) return ss
                            }
                            return null
                        }
                    }

                    function getDescription(document) {
                        const head = document.querySelector("head")
                        if (head) {
                            const content = head.querySelector("meta[property='og:description']")?.content
                            return content
                        }
                        return null
                    }

                    function getCreatedAt(article) {
                        const time = article.querySelector("time")
                        return time ? time.dateTime : null
                    }

                    const images = getImages(main)
                    const profileImageURL = getProfileImageURL(document)
                    const userName = getUserName(document)
                    const authorName = getAuthorName(document)
                    const description = getDescription(document)
                    const createdAt = getCreatedAt(main)

                    return {
                        description,
                        images,
                        videos: [],
                        profileImageURL: profileImageURL || '',
                        userName,
                        authorName,
                        createdAt,
                        status: { likeCount: 0, replyCount: 0, videoViewCount: 0, viewPlayCount: 0 }
                    }
                }
            }

        } catch (ex) {
            return {
                errorMessage: ex.message,
                errorStack: ex.stack,
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

    const { errorMessage, errorStack, description, media, userName, authorName, profileImageURL, createdAt, status } = evaluatedResult

    if (errorMessage) throw new Error(`${errorMessage}\n${errorStack}`)

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