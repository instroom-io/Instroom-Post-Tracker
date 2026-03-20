import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:workspaceSlug/influencers',
        destination: '/:workspaceSlug/campaigns',
        permanent: false,
      },
      {
        source: '/:workspaceSlug/posts',
        destination: '/:workspaceSlug/campaigns',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ensemble.so',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
