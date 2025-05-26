import { MetadataRoute } from 'next'
import { getCanonicalUrl } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalUrl()
  
  const routes = [
    '',
    '/about',
    '/how-to',
    '/faq',
    '/examples',
    '/hls-guide',
    '/privacy',
    '/terms',
    '/dmca',
  ]
  
  return routes.map((route) => ({
    url: getCanonicalUrl(route),
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}