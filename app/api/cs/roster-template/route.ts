import { NextResponse } from "next/server"
import { buildRosterTemplateBuffer } from "@/lib/excel-roster-template"

export async function GET() {
  try {
    const buffer = await buildRosterTemplateBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template-roster-order.xlsx"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("GET roster template:", error)
    return NextResponse.json(
      { message: "Gagal membuat template Excel" },
      { status: 500 }
    )
  }
}
