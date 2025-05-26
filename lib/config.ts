/**
 * Site configuration
 * This file centralizes all site URLs and configuration
 */

// Determine the site URL based on environment
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
  process.env.NODE_ENV === 'production' 
    ? 'https://lyricless.app' 
    : 'http://localhost:3000';

// Alternative domains
export const APP_SUBDOMAIN_URL = 'https://app.lyricless.app';

// Direct download domain for bypassing Cloudflare
export const DIRECT_DOWNLOAD_DOMAIN = process.env.DIRECT_DOWNLOAD_DOMAIN || 'dl.lyricless.com';

// Site metadata
export const SITE_NAME = 'Lyricless';
export const SITE_DESCRIPTION = 'Free online tool to extract video URLs from websites. Support for MP4, WebM, HLS, and DASH streams. No registration required.';

/**
 * Get the metadata base URL
 * This ensures OG images and other metadata use the correct domain
 */
export function getMetadataBase(): URL {
  return new URL(SITE_URL);
}

/**
 * Get the canonical URL for a given path
 */
export function getCanonicalUrl(path: string = ''): string {
  const baseUrl = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}