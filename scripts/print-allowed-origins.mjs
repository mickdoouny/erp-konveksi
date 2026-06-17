import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env") })

const mod = await import("../next.config.ts")
const origins = mod.default?.allowedDevOrigins ?? []
console.log("ALLOWED_DEV_ORIGINS env:", process.env.ALLOWED_DEV_ORIGINS?.slice(0, 80) + "...")
console.log("Computed allowedDevOrigins:", JSON.stringify(origins, null, 2))
