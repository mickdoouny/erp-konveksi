import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const designs = await prisma.leadOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,

        leadCode: true,
        namaCs: true,

        namaKonsumen: true,
        namaArtikel: true,

        statusDesain: true,

        catatanDesain: true,
        catatanRevisi: true,

        fileMockup: true,
        fileFinalDesain: true,

        approvedDesignAt: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: designs,
    });
  } catch (error) {
    console.error("GET DESIGNS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data design",
      },
      {
        status: 500,
      }
    );
  }
}