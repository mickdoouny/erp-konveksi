import { NextResponse } from "next/server"
import { findKonsumenByNormalizedPhone } from "@/lib/konsumen-phone-lookup"
import {
  INVALID_PHONE_MESSAGE,
  isValidIndonesianPhone,
} from "@/lib/phone-normalize"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telepon = searchParams.get("telepon")?.trim() ?? ""

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

    const match = await findKonsumenByNormalizedPhone(telepon)

    if (!match) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      namaKonsumen: match.namaKonsumen,
      noTelepon: match.noTelepon,
      alamatPengiriman: match.alamatPengiriman ?? "",
      provinsi: match.provinsi ?? "",
      kotaKabupaten: match.kotaKabupaten ?? "",
      kecamatan: match.kecamatan ?? "",
      kodePos: match.kodePos ?? "",
      lastOrderAt: match.lastOrderAt.toISOString(),
    })
  } catch (error) {
    console.error("GET KONSUMEN BY PHONE:", error)
    return NextResponse.json(
      { message: "Gagal mencari data konsumen" },
      { status: 500 }
    )
  }
}
