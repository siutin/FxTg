function getWebInfoFromScheduledServerJS(script) {
    const relayPrefetchedStreamCache = script?.["require"]?.[0]?.[3]?.[0]?.["__bbox"]?.["require"]?.[0]
    const rolarisPostRootQueryRelayPreloader__result__data = relayPrefetchedStreamCache?.[3]?.[1]?.["__bbox"]?.["result"]?.["data"]
    const xdtApiV1MediaShortcodeWebInfo = rolarisPostRootQueryRelayPreloader__result__data?.["xdt_api__v1__media__shortcode__web_info"]
    return xdtApiV1MediaShortcodeWebInfo
}

function getMediaFromWebInfo(webInfo) {
    const item = webInfo?.["items"]?.[0]
    const carousel_media = item?.["carousel_media"]
    const parsed = []
    if (carousel_media) {
        carousel_media.forEach(o => {
            const images = o["image_versions2"]["candidates"]
            const largestImage = images.sort((a, b) => b.height - a.height)[0]
            const media_type = o["media_type"]
            const isVideo = media_type === 2
            parsed.push({
                src: largestImage.url,
                alt: o.accessibility_caption || null,
                height: largestImage.height,
                width: largestImage.width,
                type: isVideo ? 'thumbnail' : 'photo'
            })

            if (isVideo) {
                const video_versions = o["video_versions"]
                const video = video_versions[0]
                parsed.push({
                    src: video.url,
                    height: video.height,
                    width: video.width,
                    type: 'video'
                })
            }
        })
    } else {
        const images = item["image_versions2"]["candidates"]
        const largestImage = images.sort((a, b) => b.height - a.height)[0]
        const isVideo = item["media_type"] === 2
        parsed.push({
            src: largestImage.url,
            alt: item.accessibility_caption || null,
            height: largestImage.height,
            width: largestImage.width,
            type: isVideo ? 'thumbnail' : 'photo'
        })
        if (isVideo) {
            const video_versions = item["video_versions"]
            const video = video_versions[0]
            parsed.push({
                src: video.url,
                alt: item.accessibility_caption || null,
                height: video.height,
                width: video.width,
                type: 'video'
            })
        }
    }
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
    if (takenAt && typeof takenAt === 'number') {
        return new Date(takenAt * 1000).toISOString()
    }
    return null
}

export {
    getWebInfoFromScheduledServerJS,
    getMediaFromWebInfo,
    getProfileImageURLFromWebInfo,
    getUserNameFromWebInfo,
    getDescriptionFromWebInfo,
    getStatusFromWebInfo,
    getCreatedAtFromWebInfo
}

