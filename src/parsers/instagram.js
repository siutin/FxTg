async function evaluate(page) {
    await page.waitForSelector('main')
    await page.waitForSelector('main [role="presentation"]')

    /*global document*/
    return await page.evaluate(() => {
        try {

            function getDescriptionText(post) {
                return post?.caption || ""
            }

            function getImages(post, isReel) {
                const sidecarChildren = post?.sidecarChildren || []
                const isVideo = post?.isVideo
                if (isReel | isVideo | sidecarChildren.length == 0) {
                    return [
                        {
                            src: post?.src,
                            alt: post?.accessibilityCaption || "",
                            width: post?.dimensions?.width,
                            height: post?.dimensions?.height,
                            type: isVideo ? 'thumbnail' : 'photo'
                        }
                    ]
                }
                return Array.from(sidecarChildren).map(item => {
                    const isVideo = item?.isVideo
                    return {
                        src: item?.src,
                        alt: item?.accessibilityCaption || "",
                        width: item?.dimensions?.width,
                        height: item?.dimensions?.height,
                        type: isVideo ? 'thumbnail' : 'photo'
                    }
                })
            }

            function getVideos(post, isReel) {
                const isVideo = post?.isVideo
                if (isReel | isVideo) {
                    return [{
                        src: post?.videoUrl,
                        duration: post?.videoDuration,
                        type: 'video'
                    }]
                }
                const sidecarChildren = post?.sidecarChildren || []
                return Array.from(sidecarChildren).filter(item => item?.isVideo).map(item => {
                    return {
                        src: item?.videoUrl,
                        alt: item?.accessibilityCaption || "",
                        width: item?.dimensions?.width,
                        height: item?.dimensions?.height,
                        type: 'video'
                    }
                })
            }

            function getCreatedAt(post) {
                const postedAt = post?.postedAt
                try {
                    if (!postedAt) return null
                    return new Date(postedAt * 1000).toISOString()
                    // eslint-disable-next-line no-unused-vars
                } catch (ex) {
                    return null
                }
            }

            function getProfileImageURL(post) {
                return post?.owner?.profilePictureUrl
            }

            function getUserName(post) {
                return post?.owner?.username
            }

            function getAuthorName(post) {
                return post?.owner?.fullName
            }

            function getStatus(post) {
                const likeCount = post?.numPreviewLikes || 0,
                    replyCount = post?.numComments || 0,
                    videoViewCount = post?.videoViews || 0,
                    viewPlayCount = post?.videoPlays || 0
                return { likeCount, replyCount, videoViewCount, viewPlayCount }
            }

            // function isInvalidPost(document) {
            //     const searchParams = new URLSearchParams(document.location.search)
            //     return searchParams.get('error') === 'invalid_post'
            // }
            // if (isInvalidPost(document)) {
            //     throw new Error('invalid post')
            // }

            function getReactPropsFromElement(elm) {
                try {
                    const name = Object.keys(elm).find((k) => k.startsWith('__reactProps$'))
                    // if (!name) throw new Error('cannot find react props from elm', elm)
                    return name ? elm[name] : null

                    // eslint-disable-next-line no-unused-vars
                } catch (ex) {
                    // pass
                }
            }

            function getPostFromReactProps(divs) {
                const check = (_reactProps) => _reactProps?.children?.props?.post
                let i = 0
                let reactProps
                while (i < divs.length) {
                    reactProps = getReactPropsFromElement(divs[i])
                    if (check(reactProps)) return reactProps.children?.props?.post
                    i++
                }
                return null
            }

            const isReel = new URL(document.location.href).pathname.indexOf('/reel/') > 0
            const main = document.querySelector('main')
            // main.querySelector('[role="presentation"]')
            if (main) {

                const divs = main.querySelectorAll('div')
                if (!(divs.length >= 1)) {
                    throw new Error("cannot find enough div elements")
                }

                const post = getPostFromReactProps(divs)
                if (!post) {
                    throw new Error("fail to extract post object")
                }

                const images = getImages(post, isReel)
                const videos = getVideos(post, isReel)
                const description = getDescriptionText(post)

                const authorName = getAuthorName(post)
                const userName = getUserName(post)
                const profileImageURL = getProfileImageURL(post)
                const createdAt = getCreatedAt(post)
                const status = getStatus(post)

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

    const { errorMessage, description, images, videos, userName, authorName, profileImageURL, createdAt, status } = evaluatedResult

    if (errorMessage) throw new Error(errorMessage)

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