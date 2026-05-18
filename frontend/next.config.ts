// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/app',
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/app',
  },
  transpilePackages: ['@clerk/nextjs'],
};

module.exports = nextConfig;
