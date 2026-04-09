import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "1e08800584e5.ngrok.app", "fc93e5c5d216.ngrok.app",],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
};

export default nextConfig;
