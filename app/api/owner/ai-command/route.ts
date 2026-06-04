import { NextResponse } from "next/server"
import { assertOwnerAccess, type ApiUserPayload } from "@/lib/owner-api-auth"
import {
  generateOwnerAiResponse,
  getOwnerAiCapabilities,
} from "@/lib/owner-ai-responder"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userRaw = searchParams.get("user")
    let user: ApiUserPayload | undefined
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as ApiUserPayload
      } catch {
        user = undefined
      }
    }

    const auth = assertOwnerAccess(user)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    const capabilities = getOwnerAiCapabilities()
    return NextResponse.json({
      success: true,
      data: {
        openAiConfigured: capabilities.openAiConfigured,
        model: capabilities.model,
        mode: capabilities.openAiConfigured ? "ai" : "smart-query",
      },
    })
  } catch (error) {
    console.error("GET OWNER AI COMMAND:", error)
    return NextResponse.json(
      { success: false, message: "Gagal memuat konfigurasi AI" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string
      user?: ApiUserPayload
    }

    const auth = assertOwnerAccess(body.user)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    const question =
      typeof body.question === "string" ? body.question.trim() : ""
    if (!question) {
      return NextResponse.json(
        { success: false, message: "Pertanyaan wajib diisi" },
        { status: 400 }
      )
    }

    if (question.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Pertanyaan terlalu panjang (maks 2000 karakter)",
        },
        { status: 400 }
      )
    }

    const { answer, meta } = await generateOwnerAiResponse(question)

    return NextResponse.json({
      success: true,
      data: { answer, meta },
    })
  } catch (error) {
    console.error("POST OWNER AI COMMAND:", error)
    return NextResponse.json(
      { success: false, message: "Gagal memproses pertanyaan AI" },
      { status: 500 }
    )
  }
}
