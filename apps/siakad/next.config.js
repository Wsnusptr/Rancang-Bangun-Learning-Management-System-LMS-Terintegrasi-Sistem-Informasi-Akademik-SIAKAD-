/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // SIAKAD runs on port 3001
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {},
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.resolve(__dirname, '../../shared')
    return config
  },
}

module.exports = nextConfig
