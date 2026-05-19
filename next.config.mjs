/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'standalone' produces .next/standalone with a self-contained Node server +
  // only the deps actually used. Required for the multi-stage Dockerfile.
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};
export default nextConfig;
