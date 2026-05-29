import { NextResponse } from "next/server"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"

export async function GET() {
  return NextResponse.json({
    enabled: isFinalOrderWorkflowEnabled(),
    envKey: "USE_FINAL_ORDER_WORKFLOW",
  })
}
