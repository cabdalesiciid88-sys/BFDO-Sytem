import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for cPanel/Passenger deployment (Hostinger): produces a
  // self-contained server bundle (.next/standalone) that Passenger can run
  // directly with `node server.js` instead of needing `next start`.
  output: "standalone",
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
