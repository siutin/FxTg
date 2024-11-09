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

function getThumbnailUrl(data) {
    return data.images.filter(o => o.type === 'thumbnail')[0]?.url
}

function renderInstantView(data) {
    function generateMediaTag(data) {
        const elements = []
        if (data.hasVideo) {
            elements.push(`<video src="${data.video.url}" controls poster="${getThumbnailUrl(data)}"></video>`)
        }
        if (data.hasImage) {
            data.images
                .filter(o => o.type === 'photo')
                .forEach(image => elements.push(`<img src="${image.url}" alt="${image.alt}" />`))
        }
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
            `<meta property="og:image" content="${getThumbnailUrl(data)}">`
        ]
    }
}