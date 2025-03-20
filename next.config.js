/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle worker loading
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js'],
  },
}

module.exports = nextConfig