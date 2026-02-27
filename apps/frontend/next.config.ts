import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
  transpilePackages: ['react-image-crop'],
};

export default nextConfig;
