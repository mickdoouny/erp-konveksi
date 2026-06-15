import { NextResponse } from "next/server"
import { lookupKonsumenByPhone } from "@/lib/konsumen-phone-lookup"
import {
  INVALID_PHONE_MESSAGE,
  isValidIndonesianPhone,
} from "@/lib/phone-normalize"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telepon =
      searchParams.get("phone")?.trim() ??
      searchParams.get("telepon")?.trim() ??
      ""

    if (!telepon) {
      return NextResponse.json(
        { message: "No. telepon wajib diisi" },
        { status: 400 }
      )
    }

    if (!isValidIndonesianPhone(telepon)) {
      return NextResponse.json(
        { message: INVALID_PHONE_MESSAGE },
        { status: 400 }
      )
    }

    const result = await lookupKonsumenByPhone(telepon)

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET KONSUMEN LOOKUP:", error)
    return NextResponse.json(
      { message: "Gagal mencari data konsumen" },
      { status: 500 }
    )
  }
}
