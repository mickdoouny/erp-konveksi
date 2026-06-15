import { execSync, spawn } from "child_process"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env") })

const lanHost = process.env.ERP_LAN_HOST?.trim() || "192.168.1.23"
const port = process.env.ERP_DEV_PORT?.trim() || "3000"
const bindAll =
  process.env.ERP_LAN_BIND_ALL === "true" || process.env.ERP_LAN_BIND_ALL === "1"
const host = bindAll ? "0.0.0.0" : lanHost
const bindAddr = `${host}:${port}`
const loginUrl = `http://${lanHost}:${port}/login`

function portListenersOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" })
    return out.split(/\r?\n/).filter((line) => line.includes("LISTENING"))
  } catch {
    return []
  }
}

function listenerMatchesBind(line) {
  if (bindAll) {
    return (
      line.includes(`0.0.0.0:${port}`) ||
      line.includes(`[::]:${port}`) ||
      line.includes(`${lanHost}:${port}`)
    )
  }
  return line.includes(bindAddr)
}

function printPortInUseHelp() {
  console.error(`\n[dev:lan] ERROR: port ${port} is already in use (EADDRINUSE).`)
  console.error(`[dev:lan] Diagnose: netstat -ano | findstr :${port}`)
  if (process.platform !== "win32") return

  const listeners = portListenersOnWindows()
  const blocking = listeners.filter((line) => listenerMatchesBind(line))

  for (const line of blocking) {
    const pid = line.trim().split(/\s+/).at(-1)
    if (!pid || pid === "0") continue
    let cmd = ""
    try {
      cmd = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
        { encoding: "utf8" }
      ).trim()
    } catch {
      /* ignore */
    }
    console.error(`[dev:lan]   PID ${pid}${cmd ? `: ${cmd}` : ""}`)
  }

  console.error(
    `[dev:lan] Stop a stale erp-konveksi dev server only: Stop-Process -Id <PID> -Force`
  )
  if (bindAll) {
    console.error(
      `[dev:lan] If another Next app uses 0.0.0.0:${port}, stop it or set ERP_DEV_PORT=3001 in .env`
    )
  }
}

function assertBindAddressFree() {
  if (process.platform !== "win32") return

  const listeners = portListenersOnWindows()
  if (listeners.some((line) => listenerMatchesBind(line))) {
    printPortInUseHelp()
    process.exit(1)
  }
}

assertBindAddressFree()

if (bindAll) {
  console.log(
    `[dev:lan] Binding ERP Konveksi to 0.0.0.0:${port} (ERP_LAN_BIND_ALL=true � all interfaces)`
  )
} else {
  console.log(
    `[dev:lan] Binding ERP Konveksi to http://${bindAddr} (set ERP_LAN_BIND_ALL=true to bind all interfaces)`
  )
}
console.log(`[dev:lan] Open login from LAN: ${loginUrl}`)
if (bindAll) {
  console.log(
    `[dev:lan] Localhost also serves ERP on this port; stop other Next apps on :${port} if needed`
  )
} else {
  console.log(
    `[dev:lan] Avoid http://localhost:${port} if another dev server shares the port`
  )
}

const nextCli = resolve(process.cwd(), "node_modules/next/dist/bin/next")

const child = spawn(
  process.execPath,
  [nextCli, "dev", "--hostname", host, "--port", port],
  {
    stdio: ["inherit", "inherit", "pipe"],
    cwd: process.cwd(),
  }
)

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk)
  if (String(chunk).includes("EADDRINUSE")) {
    printPortInUseHelp()
  }
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
