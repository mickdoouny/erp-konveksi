import type { NextConfig } from "next";

function parseAllowedDevOrigin(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).host;
    }
  } catch {
    return null;
  }
  return trimmed;
}

/** LAN hostnames for operator phones in `npm run dev:lan` (Next.js blocks dev assets otherwise). */
const allowedDevOrigins = (
  process.env.ALLOWED_DEV_ORIGINS ??
  "192.168.1.23,192.168.1.23:3000,127.0.0.1:3000,localhost:3000"
)
  .split(",")
  .map(parseAllowedDevOrigin)
  .filter((origin): origin is string => Boolean(origin));

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
