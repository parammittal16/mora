import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The intake wizard can submit up to eight 8MB images in one action.
    serverActions: {
      bodySizeLimit: "70mb",
    },
  },
};

export default nextConfig;
