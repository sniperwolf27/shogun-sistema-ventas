/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Optimize for production
  swcMinify: true,

  // Disable source maps in production (smaller bundle)
  productionBrowserSourceMaps: false,

  // Recharts optimization
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'recharts': 'recharts/es6',
    };
    return config;
  },
};

module.exports = nextConfig;
