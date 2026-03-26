import type { NextConfig } from "next";

const isGHPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(isGHPages && {
    basePath: "/CLT_Dash",
    assetPrefix: "/CLT_Dash/",
  }),
};

export default nextConfig;
