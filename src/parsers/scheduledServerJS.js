function getFileNameFromUrl(url) {
  const urlPath = new URL(url).pathname
  return urlPath.substring(urlPath.lastIndexOf('/') + 1).toLowerCase()
}

export function getImagesFromScheduledServerJS(script) {
  const relayPrefetchedStreamCache = script?.["require"]?.[0]?.[3]?.[0]?.["__bbox"]?.["require"]?.[0]
  const rolarisPostRootQueryRelayPreloader__result__data = relayPrefetchedStreamCache?.[3]?.[1]?.["__bbox"]?.["result"]?.["data"]
  const xdtApiV1MediaShortcodeWebInfo = rolarisPostRootQueryRelayPreloader__result__data?.["xdt_api__v1__media__shortcode__web_info"]
  const carousel_media = xdtApiV1MediaShortcodeWebInfo?.["items"]?.[0]?.["carousel_media"]
  const parsed = carousel_media.map(o => {
    const images = o["image_versions2"]["candidates"]
    const largestImage = images.sort((a, b) => b.height - a.height)[0]
    return {
      code: o.code,
      pk: o.pk,
      id: o.id,      
      image: {
        alt: o.accessibility_caption || null,
        url: largestImage.url,
        filename: getFileNameFromUrl(largestImage.url),
        height: largestImage.height,
        width: largestImage.width
      }
    }
  })
  return parsed
}