export default function (data) {
    const elements = []

    if (data.hasVideo) {
        elements.push(renderVideo(data))
    } else if (data.hasImage) {
        elements.push(renderImage(data))
    }
    elements.push(renderText(data))
    elements.push(renderInstantView(data))

    const meta = elements.filter(element => element.metaArray).flatMap(element => element.metaArray).join('')
    const body = elements.filter(element => element.bodyArray).flatMap(element => element.bodyArray).join('')
    return `<html><head>${meta}</head><body>${body}</body></html>`
}

function renderStatus(data) {
    return `<p>${data.likeCount} ❤️ ${data.replyCount} 💬 ${data.repostCount} 🔁 ${data.shareCount}</p>`
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
                <p><a href="https://www.threads.net/${data.username}">${data.username}</a></p>
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
    return {
        metaArray: [
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta property="twitter:image" content="${data.images[0].url}">`,
            `<meta property="og:image" content="${data.images[0].url}">`
        ]
    }
}

function renderVideo(data) {
    return {
        metaArray: [
            `<meta property="twitter:player" content="${data.videos[0].url}">`,
            `<meta property="twitter:player:stream" content="${data.videos[0].url}"/>`,
            `<meta property="twitter:player:stream:content_type" content="${data.videos[0].format}"/>`,
            `<meta property="twitter:player:width" content="${data.videos[0].width}">`,
            `<meta property="twitter:player:height" content="${data.videos[0].height}">`,
            `<meta property="og:type" content="video.other">`,
            `<meta property="og:video:url" content="${data.videos[0].url}">`,
            `<meta property="og:video:secure_url" content="${data.videos[0].url}">`,
            `<meta property="og:video:width" content="${data.videos[0].width}">`,
            `<meta property="og:video:height" content="${data.videos[0].height}">`,
            `<meta property="og:image" content="${getThumbnailUrl(data, 0)}">`
        ]
    }
}