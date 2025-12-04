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
    await page.waitForSelector('main')
    await page.waitForSelector('main [role="presentation"]')
    await page.waitForSelector('script[type="application/json"][data-sjs]')

    /*global document*/
    return await page.evaluate(() => {
        try {

            // selector script[type="application/json"][data-sjs]
            const scripts = document.querySelectorAll('script[type="application/json"][data-sjs]')
            const scheduledServerJSs = Array.from(scripts).map(o => o.text).filter(o => o.contains('"ScheduledServerJS"'))
            const targetScript = scheduledServerJSs.find(o => o.contains('xdt_api__v1__media__shortcode__web_info'))

            function getFileNameFromUrl(url) {
                const urlPath = new URL(url).pathname
                return urlPath.substring(urlPath.lastIndexOf('/') + 1).toLowerCase()
            }

            function getWebInfoFromScheduledServerJS(script) {
                const relayPrefetchedStreamCache = script?.["require"]?.[0]?.[3]?.[0]?.["__bbox"]?.["require"]?.[0]
                const rolarisPostRootQueryRelayPreloader__result__data = relayPrefetchedStreamCache?.[3]?.[1]?.["__bbox"]?.["result"]?.["data"]
                const xdtApiV1MediaShortcodeWebInfo = rolarisPostRootQueryRelayPreloader__result__data?.["xdt_api__v1__media__shortcode__web_info"]
                return xdtApiV1MediaShortcodeWebInfo
            }

            function getMediaFromWebInfo(webInfo) {
                const carousel_media = webInfo?.["items"]?.[0]?.["carousel_media"]
                const parsed = []
                carousel_media.forEach(o => {
                    const images = o["image_versions2"]["candidates"]
                    const largestImage = images.sort((a, b) => b.height - a.height)[0]
                    const media_type = o["media_type"]
                    const isVideo = media_type === 2
                    parsed.push({
                        // code: o.code,
                        // pk: o.pk,
                        // id: o.id,
                        src: largestImage.url,
                        alt: o.accessibility_caption || null,
                        // filename: getFileNameFromUrl(largestImage.url),
                        height: largestImage.height,
                        width: largestImage.width,
                        type: isVideo ? 'thumbnail' : 'photo'
                    })

                    if (isVideo) {
                        const video_versions = o["video_versions"]
                        const video = video_versions[0]
                        parsed.push({
                            // code: o.code,
                            // pk: o.pk,
                            // id: o.id,
                            src: video.url,
                            // filename: getFileNameFromUrl(video.url),
                            height: video.height,
                            width: video.width,
                            type: 'video'
                        })
                    }
                })
                return parsed
            }

            function getProfileImageURLFromWebInfo(webInfo) {
                return webInfo?.["items"]?.[0]?.['user']?.['profile_pic_url']
            }

            function getUserNameFromWebInfo(webInfo) {
                return webInfo?.["items"]?.[0]?.['user']?.['username']
            }

            function getDescriptionFromWebInfo(webInfo) {
                return webInfo?.["items"]?.[0]?.['caption']?.['text']
            }

            function getStatusFromWebInfo(webInfo) {
                const likeCount = webInfo?.["items"]?.[0]?.['like_count']
                const commentCount = webInfo?.["items"]?.[0]?.['comment_count']
                const viewCount = webInfo?.["items"]?.[0]?.['view_count']
                return {
                    likeCount: likeCount || 0,
                    replyCount: commentCount || 0,
                    viewCount: viewCount || 0
                }
            }

            function getCreatedAtFromWebInfo(webInfo) {
                const takenAt = webInfo?.["items"]?.[0]?.['taken_at']
                const createdAt = new Date(takenAt).toISOString()
                return createdAt
            }

            if (targetScript) {

                const webInfo = getWebInfoFromScheduledServerJS(JSON.parse(targetScript))
                const parsedMedia = getMediaFromWebInfo(webInfo)

                const ssImages = parsedMedia.filter(o => o.type === 'photo' || o.type === 'thumbnail')
                const ssVideos = parsedMedia.filter(o => o.type === 'video')
                const ssProfileImageURL = getProfileImageURLFromWebInfo(webInfo)
                const ssUserName = getUserNameFromWebInfo(webInfo)
                const ssDescription = getDescriptionFromWebInfo(webInfo)
                const ssCreatedAt = getCreatedAtFromWebInfo(webInfo)
                const ssStatus = getStatusFromWebInfo(webInfo)
                return {
                    description: ssDescription,
                    images: ssImages,
                    videos: ssVideos,
                    profileImageURL: ssProfileImageURL || '',
                    userName: ssUserName,
                    authorName: ssUserName,
                    createdAt: ssCreatedAt,
                    status: ssStatus
                }
            } else {
                const isReel = new URL(document.location.href).pathname.indexOf('/reel/') > 0
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
    })

}

function callback(evaluatedResult) {

    const { errorMessage, errorStack, description, images, videos, userName, authorName, profileImageURL, createdAt, status } = evaluatedResult

    if (errorMessage) throw new Error(`${errorMessage}\n${errorStack}`)

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