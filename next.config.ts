import type { NextConfig } from "next";

const SIGNALING_ORIGIN =
  process.env.NEXT_PUBLIC_SIGNALING_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SIGNALING_ORIGIN: SIGNALING_ORIGIN,
  },
};

export default nextConfig;
