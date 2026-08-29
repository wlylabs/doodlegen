/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Directory-style URLs (out/studio/index.html) resolve on every static host,
  // including the ones that do not rewrite /studio to studio.html.
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
