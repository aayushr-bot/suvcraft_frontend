import type { NextConfig } from "next";

// When deployed under a subpath (e.g. dpr.sarstage.online/suvcraft),
// set BASE_PATH=/suvcraft in the build env. All routes and asset URLs
// become prefixed with it. Local dev leaves BASE_PATH unset.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(basePath && { basePath, assetPrefix: basePath }),
};

export default nextConfig;
