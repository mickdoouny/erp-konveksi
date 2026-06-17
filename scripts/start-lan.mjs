import { execSync, spawn } from "child_process";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const lanHost = process.env.ERP_LAN_HOST?.trim() || "192.168.100.122";
const port = process.env.ERP_DEV_PORT?.trim() || "3000";
const host = "0.0.0.0";
const bindAddr = `${host}:${port}`;
const loginUrl = `http://${lanHost}:${port}/login`;

const buildIdPath = resolve(process.cwd(), ".next", "BUILD_ID");
const runtimeBuildIdPath = resolve(process.cwd(), ".next", ".start-lan-build-id");

if (!existsSync(buildIdPath)) {
  console.error("[start:lan] ERROR: production build missing. Run: npm run build");
  process.exit(1);
}

const buildId = readFileSync(buildIdPath, "utf8").trim();

function portListenersOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    return out.split(/\r?\n/).filter((line) => line.includes("LISTENING"));
  } catch {
    return [];
  }
}

function printPortInUseHelp() {
  console.error(`\n[start:lan] ERROR: port ${port} is already in use.`);
  console.error(`[start:lan] Stale server after "npm run build" causes CSS/JS 500 for operators.`);
  console.error(`[start:lan] Fix: npm run restart:lan   (or stop PID below, then start:lan)`);
  console.error(`[start:lan] Diagnose: netstat -ano | findstr :${port}`);
  for (const line of portListenersOnWindows()) {
    const pid = line.trim().split(/\s+/).at(-1);
    if (!pid || pid === "0") continue;
    console.error(`[start:lan]   PID ${pid}`);
  }
  if (existsSync(runtimeBuildIdPath)) {
    const runningId = readFileSync(runtimeBuildIdPath, "utf8").trim();
    if (runningId && runningId !== buildId) {
      console.error(
        `[start:lan] BUILD_ID mismatch: running=${runningId} disk=${buildId} — operators see unstyled pages.`
      );
    }
  }
}

const listeners = portListenersOnWindows();
if (listeners.some((line) => line.includes(`0.0.0.0:${port}`) || line.includes(`[::]:${port}`))) {
  printPortInUseHelp();
  process.exit(1);
}

writeFileSync(runtimeBuildIdPath, buildId, "utf8");

console.log(`[start:lan] Production ERP on ${bindAddr} (next start)`);
console.log(`[start:lan] BUILD_ID ${buildId}`);
console.log(`[start:lan] Open login from LAN: ${loginUrl}`);
console.log(`[start:lan] After rebuild always run: npm run restart:lan`);

const nextCli = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "start", "--hostname", host, "--port", port], {
  stdio: "inherit",
  cwd: process.cwd(),
});
child.on("exit", (code) => process.exit(code ?? 0));
