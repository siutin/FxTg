export default function (data) {
    const elements = []
    elements.push(renderSiteName(data))
    const isFirstImageThumbnail = data.images[data.mediaIndex ?? 0]?.type === 'thumbnail'
    if (isFirstImageThumbnail) {
        elements.push(renderVideo(data))
    } else if (data.hasImage) {
        elements.push(renderImage(data))
    }

    elements.push(renderText(data))

    // render instant view only if the first media is not a video
    if (!isFirstImageThumbnail) {
        elements.push(renderInstantView(data))
    }

    const meta = elements.filter(element => element.metaArray).flatMap(element => element.metaArray).join('')
    const body = elements.filter(element => element.bodyArray).flatMap(element => element.bodyArray).join('')
    return `<html><head>${meta}</head><body>${body}</body></html>`
}

function renderSiteName(data) {
    const siteName = data.serviceName == 'threads' ? 'FxThreads' : (
        data.serviceName == 'instagram' ? 'FxInstagrams' : ''
    )
    return {
        metaArray: [`<meta property="og:site_name" content="${siteName}"/>`]
    }
}

function renderStatus(data) {
    let arr = []
    if (data.videoPlays !== undefined) {
        arr.push(`${data.videoPlays} ▶️`)
    }
    if (data.likeCount !== undefined) {
        arr.push(`${data.likeCount} ❤️`)
    }
    if (data.replyCount !== undefined) {
        arr.push(`${data.replyCount} 💬`)
    }
    if (data.repostCount !== undefined) {
        arr.push(`${data.repostCount} 🔁`)
    }
    if (data.shareCount !== undefined) {
        arr.push(`${data.shareCount}`)
    }
    return `<p>${arr.join(' ')}<p>`
    // return `<p>${data.likeCount} ❤️ ${data.replyCount} 💬 ${data.repostCount} 🔁 ${data.shareCount}</p>`
}

function getThumbnailUrl(data, index) {
    return data.images.filter(o => o.type === 'thumbnail').at(index)?.url
}

function renderInstantView(data) {
    function generateMediaTag(data) {
        const elements = []

        let videoIndex = 0
        data.images.forEach(image => {
            if (image.type === 'photo') {
                elements.push(`<img src="${image.url}" alt="${image.alt}" />`)
            } else if (image.type === 'thumbnail') {
                elements.push(`<video src="${data.videos[videoIndex].url}" controls poster="${getThumbnailUrl(data, videoIndex)}"></video>`)
                videoIndex++
            }
        })
        return elements.join('')
    }

    const host = (() => {
        switch (data.serviceName) {
            case 'threads': return 'https://www.threads.net/'
            case 'instagram': return 'https://www.instagram.com/'
            default: throw new Error(`service '${data.serviceName}' is not supported yet`)
        }
    })()

    return {
        metaArray: [
            `<meta property="al:android:app_name" content="Medium"/>`,
            `<meta property="article:published_time" content="${data.createdAt}" />`
        ],
        bodyArray: [
            `<section class="section-backgroundImage"><figure class="graf--layoutFillWidth"></figure></section>`,
            `<article>
                <sub><a href="${data.url}">View full thread</a></sub>

                <sub>(${data.username})</sub>
                <p>${data.description}</p>
                ${generateMediaTag(data)}
                ${renderStatus(data.status)}

                <h2>About author</h2>
                <img src="${data.profileImageURL}" alt="${data.username}'s profile picture" />
                <h2>${data.authorName}</h2>
                <p><a href="${host}${data.username}">${data.username}</a></p>
            </article>`
        ]
    }
}

function renderText(data) {
    return {
        metaArray: [
            `<meta property="og:url" content="${data.url}"/>`,
            `<meta property="og:title" content="Thread from ${data.username}"/>`,
            `<meta name="twitter:description" content="${data.description}">`
        ]
    }
}

function renderImage(data) {
    const url = data.mediaIndex == null ? (data.images.length > 1 ? data.mosaicUrl : data.images[0].url) : data.images[data.mediaIndex].url
    return {
        metaArray: [
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta property="twitter:image" content="${url}">`,
            `<meta property="og:image" content="${url}">`
        ]
    }
}

function renderVideo(data) {
    let mediaIndex = data.mediaIndex ?? 0
    let videoIndex = data.images.slice(0, mediaIndex).reduce((count, image) => {
        return count + (image.type === 'thumbnail' ? 1 : 0)
    }, 0)

    return {
        metaArray: [
            `<meta property="twitter:player" content="${data.videos[videoIndex].url}">`,
            `<meta property="twitter:player:stream" content="${data.videos[videoIndex].url}"/>`,
            `<meta property="twitter:player:stream:content_type" content="${data.videos[videoIndex].format}"/>`,
            `<meta property="twitter:player:width" content="${data.videos[videoIndex].width}">`,
            `<meta property="twitter:player:height" content="${data.videos[videoIndex].height}">`,
            `<meta property="og:type" content="video.other">`,
            `<meta property="og:video:url" content="${data.videos[videoIndex].url}">`,
            `<meta property="og:video:secure_url" content="${data.videos[videoIndex].url}">`,
            `<meta property="og:video:width" content="${data.videos[videoIndex].width}">`,
            `<meta property="og:video:height" content="${data.videos[videoIndex].height}">`,
            `<meta property="og:image" content="${getThumbnailUrl(data, mediaIndex)}">`
        ]
    }
}