/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: "export"` — Vercel builds Next.js natively and keeps these
  // pages static. Static export (`out/`) conflicts with Vercel's pipeline and
  // triggers a "routes-manifest.json was not found" error. For self-hosting a
  // pure static bundle instead, re-add `output: "export"` and serve `out/`.
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
