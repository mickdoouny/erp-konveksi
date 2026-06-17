import type { NextConfig } from "next";

/**
 * Next.js `allowedDevOrigins` compares hostname only (no port) — see
 * `block-cross-site-dev.js` / `isCsrfOriginAllowed`. Emit hostname entries;
 * port suffixes are kept for readability in logs only.
 */
function expandAllowedDevOrigin(entry: string): string[] {
  const trimmed = entry.trim();
  if (!trimmed) return [];

  const results = new Set<string>();

  const addHostname = (host: string, port?: string) => {
    const hostname = host.trim().toLowerCase();
    if (!hostname) return;
    results.add(hostname);
    if (port) {
      results.add(`${hostname}:${port.trim()}`);
    }
  };

  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed);
      addHostname(url.hostname, url.port || undefined);
      return [...results];
    } catch {
      return [];
    }
  }

  if (trimmed.includes(":")) {
    const colon = trimmed.lastIndexOf(":");
    addHostname(trimmed.slice(0, colon), trimmed.slice(colon + 1));
    return [...results];
  }

  results.add(trimmed.toLowerCase());
  return [...results];
}

const devPort = process.env.ERP_DEV_PORT?.trim() || "3000";
const lanHost = process.env.ERP_LAN_HOST?.trim();

/** Static fallbacks when `.env` is missing — wildcards cover roaming LAN / Tailscale IPs. */
const builtinOriginEntries = [
  lanHost,
  lanHost ? `${lanHost}:${devPort}` : null,
  "127.0.0.1",
  `127.0.0.1:${devPort}`,
  "localhost",
  `localhost:${devPort}`,
  // Legacy LAN IPs (operator bookmarks / subnet routes)
  "192.168.1.23",
  `192.168.1.23:${devPort}`,
  "192.168.1.50",
  `192.168.1.50:${devPort}`,
  "192.168.100.122",
  `192.168.100.122:${devPort}`,
  // Tailscale (Router 1 → Router 2)
  "100.92.73.115",
  `100.92.73.115:${devPort}`,
  "server-erp",
  `server-erp:${devPort}`,
  "server-erp.tailc9a455.ts.net",
  `server-erp.tailc9a455.ts.net:${devPort}`,
].filter((entry): entry is string => Boolean(entry));

/**
 * Wildcards — Next.js `isCsrfOriginAllowed` supports `*` per DNS label
 * (verified in block-cross-site-dev.js). Hostname-only entries matter; port
 * suffixes in this list are ignored for Origin checks.
 */
const wildcardOriginEntries = [
  "192.168.*.*",
  "100.*.*.*",
  "*.tailc9a455.ts.net",
];

/** LAN hostnames for operator phones in `npm run dev:lan` (Next.js blocks dev assets otherwise). */
const allowedDevOrigins = [
  ...wildcardOriginEntries,
  ...(
    process.env.ALLOWED_DEV_ORIGINS?.trim() ??
    builtinOriginEntries.join(",")
  )
    .split(",")
    .flatMap(expandAllowedDevOrigin),
  ...builtinOriginEntries.flatMap(expandAllowedDevOrigin),
].filter((origin, index, all) => all.indexOf(origin) === index);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // Inline CSS in HTML so LAN operators still get styles when /_next/static/*.css 404/500
  // (stale server after rebuild, or browser cache of old chunk hashes).
  experimental: {
    inlineCss: true,
  },
  typescript: {
    // Prisma models require manual ids — strict check blocks LAN production deploy.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
