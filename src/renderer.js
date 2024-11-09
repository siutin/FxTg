export default function (data) {
    const elements = []

    if (data.hasVideo) {
        elements.push(renderVideo(data))
    } else if (data.hasImage) {
        elements.push(renderImage(data))
    }
    elements.push(renderText(data))

    const meta = elements.filter(element => element.metaArray).flatMap(element => element.metaArray).join('')
    const body = elements.filter(element => element.bodyArray).flatMap(element => element.bodyArray).join('')
    return `<html><head>${meta}</head><body>${body}</body></html>`
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
    return {
        metaArray: [
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta property="twitter:image" content="${data.image.url}">`,
            `<meta property="og:image" content="${data.image.url}">`
        ]
    }
}

function renderVideo(data) {
    return {
        metaArray: [
            `<meta property="twitter:player" content="${data.video.url}">`,
            `<meta property="twitter:player:stream" content="${data.video.url}"/>`,
            `<meta property="twitter:player:stream:content_type" content="${data.video.format}"/>`,
            `<meta property="twitter:player:width" content="${data.video.width}">`,
            `<meta property="twitter:player:height" content="${data.video.height}">`,
            `<meta property="og:type" content="video.other">`,
            `<meta property="og:video:url" content="${data.video.url}">`,
            `<meta property="og:video:secure_url" content="${data.video.url}">`,
            `<meta property="og:video:width" content="${data.video.width}">`,
            `<meta property="og:video:height" content="${data.video.height}">`,
            `<meta property="og:image" content="${data.video.thumbnailUrl}">`
        ]
    }
}