/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false, // 👈 Fuerza el modo pages
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/vip/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
