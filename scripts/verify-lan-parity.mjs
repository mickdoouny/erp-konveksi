/**
 * Verify LAN parity: same HTML from every hostname (no cookie).
 * Usage: node scripts/verify-lan-parity.mjs [baseUrl]
 *
 * Compares 127.0.0.1, localhost, and LAN IP against each other.
 * Fails if byte-length or body differs, cache-control missing on HTML,
 * or critical inline CSS absent.
 */
const lanHost = process.env.ERP_LAN_HOST?.trim() || "192.168.100.122";
const port = process.env.ERP_DEV_PORT?.trim() || "3000";
const baseFromArg = process.argv[2]?.replace(/\/$/, "");

const hosts = baseFromArg
  ? [baseFromArg]
  : [
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
      `http://${lanHost}:${port}`,
    ];

const paths = ["/login", "/desainer/antrian"];

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

async function fetchPath(host, path) {
  const res = await fetch(`${host}${path}`, { redirect: "manual" });
  const body = await res.text();
  return {
    status: res.status,
    body,
    cache: res.headers.get("cache-control"),
    location: res.headers.get("location"),
  };
}

function hasCriticalCss(html) {
  return html.includes("<style") && html.includes("neo-card");
}

async function main() {
  console.log(`LAN parity check — hosts: ${hosts.join(", ")}`);
  let ok = true;

  for (const path of paths) {
    console.log(`\n${path}`);
    const results = new Map();

    for (const host of hosts) {
      try {
        const r = await fetchPath(host, path);
        results.set(host, r);
        console.log(
          `  ${host} → HTTP ${r.status} len=${r.body.length} cache=${r.cache ?? "(none)"}`
        );
      } catch (e) {
        console.error(`  ${host} → ERROR ${e.message}`);
        ok = false;
      }
    }

    if (results.size < 2) continue;

    const entries = [...results.entries()];
    const ref = entries[0][1];

    for (const [host, r] of entries.slice(1)) {
      if (r.body !== ref.body) {
        ok = false;
        fail(`${path}: body differs between ${entries[0][0]} and ${host}`);
      }
    }

    if (path === "/login") {
      if (ref.status !== 200) {
        ok = false;
        fail(`${path}: expected HTTP 200, got ${ref.status}`);
      }
      if (!ref.cache?.includes("no-store")) {
        ok = false;
        fail(`${path}: missing Cache-Control: no-store`);
      }
      if (!hasCriticalCss(ref.body)) {
        ok = false;
        fail(`${path}: missing inline critical CSS (neo-card)`);
      }
    }

    if (path === "/desainer/antrian") {
      const expectRedirect = ref.status === 307 || ref.status === 302;
      if (!expectRedirect) {
        ok = false;
        fail(`${path}: expected redirect without cookie, got ${ref.status}`);
      }
      for (const [, r] of entries) {
        if (r.status !== ref.status) {
          ok = false;
          fail(`${path}: status mismatch across hosts`);
        }
      }
    }

    if (entries.every(([, r]) => r.body === ref.body)) {
      console.log("  OK: byte-identical across all hosts");
    }
  }

  if (ok) {
    console.log("\nAll parity checks passed.");
  } else {
    console.error("\nParity checks failed. See above.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
