import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build — produces a self-contained
  // server.js plus the exact node_modules it needs, nothing more.
  output: 'standalone',

  images: {
    // unoptimized was set while running without a CDN. Re-enable once
    // uploads are behind a CDN or the domain is stable enough to use
    // Next.js image optimisation.
    unoptimized: true,
    remotePatterns: [
      // Local development only — removed automatically in production builds
      ...(process.env.NODE_ENV === 'development'
        ? ([
            {
              protocol: 'http',
              hostname: 'localhost',
              port: '4000',
              pathname: '/uploads/**',
            },
          ] as const)
        : []),
      // Production: locked to your own domain via NEXT_PUBLIC_BACKEND_HOSTNAME.
      // Set this in .env / docker-compose build args.
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_BACKEND_HOSTNAME ?? 'yourdomain.com',
        pathname: '/uploads/**',
      },
    ],
  },
  transpilePackages: ['react-image-crop'],
};

export default nextConfig;
