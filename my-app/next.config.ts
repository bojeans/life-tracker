import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  // The Prisma client is generated to a custom dir (src/generated/prisma), so
  // Next's file tracer misses the platform query-engine binary and serverless
  // functions fail with "could not locate the Query Engine". Force-include it.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
