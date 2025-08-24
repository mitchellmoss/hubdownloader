/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  
  experimental: {
    serverComponentsExternalPackages: ['puppeteer'],
  },
  
  // Server-side only configuration
  webpack: (config, { isServer }) => {
    // Server-side optimizations only
    return config;
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(), camera=(), geolocation=()'
          }
        ],
      },
      {
        // API CORS headers
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type'
          }
        ],
      }
    ];
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}