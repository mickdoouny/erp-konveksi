/**
 * Diagnose LAN static asset loading (run on server PC).
 * Usage: node scripts/diagnose-lan-assets.mjs [baseUrl]
 */
const baseUrl = process.argv[2] || "http://192.168.100.122:3000";

async function checkPage(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const html = await res.text();
  const assets = [
    ...html.matchAll(/href="(\/_next\/static\/[^"]+)"/g),
    ...html.matchAll(/src="(\/_next\/static\/[^"]+)"/g),
  ].map((m) => m[1]);
  const unique = [...new Set(assets)];
  const css = unique.filter((p) => p.includes(".css"));
  const failed = [];

  for (const assetPath of unique) {
    const assetRes = await fetch(`${baseUrl}${assetPath}`);
    if (!assetRes.ok) {
      failed.push({ path: assetPath, status: assetRes.status });
    }
  }

  const hasInlineStyle = html.includes("<style") && html.includes("neo-card");
  return { path, status: res.status, cache: res.headers.get("cache-control"), css, failed, hasInlineStyle, htmlLen: html.length };
}

async function main() {
  console.log(`Diagnose: ${baseUrl}`);
  for (const path of ["/login", "/desainer/antrian"]) {
    const r = await checkPage(path);
    console.log(`\n${path}: HTTP ${r.status}, cache=${r.cache}, inline-css=${r.hasInlineStyle}`);
    console.log(`  css refs: ${r.css.join(", ") || "(none — inlineCss active)"}`);
    if (r.failed.length) {
      console.error("  FAIL assets:");
      for (const f of r.failed) console.error(`    ${f.status} ${f.path}`);
      console.error("  => Stale server after rebuild. Run: npm run restart:lan");
      process.exit(1);
    }
    console.log("  OK: all referenced static assets return 200");
  }
  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
