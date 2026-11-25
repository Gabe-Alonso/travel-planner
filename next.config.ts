import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app is per-user and rendered on demand, so we use the
  // classic dynamic rendering model instead of Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
