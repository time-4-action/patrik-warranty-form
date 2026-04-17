import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://www.patrikinternational.com",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
