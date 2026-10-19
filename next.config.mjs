/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The ingestion worker / drizzle imports run server-side only.
  serverExternalPackages: ["postgres", "drizzle-orm"],
  // Listing photos render with plain <img>, not next/image, so the image
  // optimizer needs no remote hosts. Add specific hosts here if that changes;
  // never a "**" wildcard, which lets anyone proxy arbitrary images through it.
};

export default nextConfig;
