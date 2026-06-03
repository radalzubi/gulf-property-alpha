/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The ingestion worker / drizzle imports run server-side only.
    serverComponentsExternalPackages: ["postgres", "drizzle-orm"],
  },
  images: {
    // Sample listing images use placeholder hosts; real feeds add their own.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
