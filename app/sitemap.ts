import { MetadataRoute } from 'next'
import { getCanonicalUrl } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalUrl()
  
  const routes = [
    {
      route: '',
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      route: '/about',
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      route: '/how-to',
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      route: '/faq',
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      route: '/examples',
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      route: '/hls-guide',
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      route: '/privacy',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      route: '/terms',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      route: '/dmca',
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      route: '/test-youtube',
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ]
  
  return routes.map((item) => ({
    url: getCanonicalUrl(item.route),
    lastModified: new Date(),
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }))
}