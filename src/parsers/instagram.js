async function evaluate(page) {
    await page.waitForSelector('main')
    await page.waitForSelector('main [role="presentation"]')

    /*global document*/
    return await page.evaluate(() => {
        try {

            const isReel = new URL(document.location.href).pathname.indexOf('/reel/') > 0
            const main = document.querySelector('main')
            // main.querySelector('[role="presentation"]')
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
                    html: document.innerHTML,
                    description,
                    images,
                    videos: [],
                    profileImageURL,
                    userName,
                    authorName,
                    createdAt,
                    status: { likeCount: 0, replyCount: 0, videoViewCount: 0, viewPlayCount: 0 }
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
            url: image.src,
            type: image.type
        })
    })

    videos.forEach(video => {
        media.push({
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