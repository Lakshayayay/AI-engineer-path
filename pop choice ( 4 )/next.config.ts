import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [{ source: "/browse", destination: "/", permanent: false }],
};

export default nextConfig;
