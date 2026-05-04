import type { NextConfig } from "next";

// When deployed under a subpath (e.g. dpr.sarstage.online/suvcraft),
// set BASE_PATH=/suvcraft in the build env. All routes and asset URLs
// become prefixed with it. Local dev leaves BASE_PATH unset.
const basePath = process.env.BASE_PATH || "";

const NO_CACHE = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(basePath && { basePath, assetPrefix: basePath }),

  async headers() {
    return [
      // Block caching of all rendered HTML so admin deletes/updates appear immediately.
      // Static assets under /_next/static are still cached aggressively (Next.js sets those itself).
      {
        source: "/((?!_next/static|favicon.ico).*)",
        headers: NO_CACHE,
      },
    ];
  },
};

export default nextConfig;
