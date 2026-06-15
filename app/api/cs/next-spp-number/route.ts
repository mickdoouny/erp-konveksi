import { NextResponse } from "next/server"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import {
  allocateNextSppNumber,
  deriveCsSppPrefix,
  resolveCsUsernameForSpp,
} from "@/lib/spp-number"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const csUsername = await resolveCsUsernameForSpp({
      csUsername: searchParams.get("csUsername"),
      csId: searchParams.get("csId"),
      db: prisma,
    })

    if (!csUsername) {
      return NextResponse.json(
        { message: "Username CS tidak ditemukan untuk membuat nomor SPP" },
        { status: 400 }
      )
    }

    const prefix = deriveCsSppPrefix(csUsername)
    const sppNumber = await allocateNextSppNumber(csUsername, prisma)

    return NextResponse.json({ sppNumber, prefix })
  } catch (error) {
    console.error("GET CS NEXT SPP NUMBER:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal membuat nomor SPP"),
      { status: 500 }
    )
  }
}
