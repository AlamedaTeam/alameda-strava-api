/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  experimental: {
    appDir: false, // 👈 fuerza modo pages
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vip',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
