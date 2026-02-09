/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  ],
};

export default nextConfig;
