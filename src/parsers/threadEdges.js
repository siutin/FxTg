function getEdgesFromScheduledServerJS(script) {
  const relayPrefetchedStreamCache = script?.["require"]?.[0]?.[3]?.[0]?.["__bbox"]?.["require"]?.[0]
  const rolarisPostRootQueryRelayPreloader__result__data = relayPrefetchedStreamCache?.[3]?.[1]?.["__bbox"]?.["result"]?.["data"]
  return rolarisPostRootQueryRelayPreloader__result__data?.data?.["edges"]
}

function findThreadItemByPostId(edges, postId) {
  return edges.flatMap(edge => edge.node.thread_items).find(item => item?.post?.code === postId)
}

function getMediaFromThreadItem(threadItem) {
  const carousel_media = threadItem?.["post"]?.["carousel_media"]
  const parsed = []
  if (carousel_media) {
    carousel_media.forEach(o => {
      const images = o["image_versions2"]["candidates"]
      const largestImage = images.sort((a, b) => b.height - a.height)[0]
      const isVideo = o["video_versions"]?.length > 0
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
          alt: o.accessibility_caption || null,
          height: video.height,
          width: video.width,
          type: 'video'
        })
      }
    })
  } else {
    const images = threadItem?.["post"]?.["image_versions2"]["candidates"]
    const largestImage = images.sort((a, b) => b.height - a.height)[0]
    const isVideo = threadItem?.["post"]?.["media_type"] === 2
    parsed.push({
      src: largestImage.url,
      alt: threadItem?.["post"]?.["accessibility_caption"] || null,
      height: largestImage.height,
      width: largestImage.width,
      type: isVideo ? 'thumbnail' : 'photo'
    })
    if (isVideo) {
      const video_versions = threadItem?.["post"]?.["video_versions"]
      const video = video_versions[0]
      parsed.push({
        src: video.url,
        alt: threadItem?.["post"]?.["accessibility_caption"] || null,
        height: video.height,
        width: video.width,
        type: 'video'
      })
    }
  }
  return parsed
}

function getUserNameFromThreadItem(threadItem) {
  return threadItem?.["post"]?.["user"]?.["username"]
}

function getAuthorNameFromThreadItem(threadItem) {
  return threadItem?.["post"]?.["user"]?.["full_name"]
}

function getProfileImageURLFromThreadItem(threadItem) {
  return threadItem?.["post"]?.["user"]?.["profile_pic_url"]
}

function getDescriptionFromThreadItem(threadItem) {
  return threadItem?.["post"]?.["caption"]?.["text"]
}

function getCreatedAtFromThreadItem(threadItem) {
  const takenAt = threadItem?.["post"]?.["taken_at"]
  if (takenAt && typeof takenAt === 'number') {
    return new Date(takenAt * 1000).toISOString()
  }
  return null
}

function getStatusFromThreadItem(threadItem) {
  const likeCount = threadItem?.["post"]?.["like_count"]
  const replyCount = threadItem?.["post"]?.["text_post_app_info"]?.["direct_reply_count"]
  const reshareCount = threadItem?.["post"]?.["text_post_app_info"]?.["reshare_count"]
  const quoteCount = threadItem?.["post"]?.["text_post_app_info"]?.["quote_count"]
  return {
    likeCount: likeCount || 0,
    replyCount: replyCount || 0,
    reshareCount: reshareCount || 0,
    quoteCount: quoteCount || 0
  }
}

export {
  getEdgesFromScheduledServerJS,
  findThreadItemByPostId,
  getUserNameFromThreadItem,
  getAuthorNameFromThreadItem,
  getProfileImageURLFromThreadItem,
  getDescriptionFromThreadItem,
  getCreatedAtFromThreadItem,
  getStatusFromThreadItem,
  getMediaFromThreadItem
}