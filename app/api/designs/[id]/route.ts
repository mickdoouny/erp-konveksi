import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const body = await request.json();
    const params = await context.params;

    const dataUpdate: any = {
      statusDesain: body.statusDesain,
      statusLead:
        body.statusDesain === "KIRIM KE CS" ||
        body.statusDesain === "REVISI SELESAI"
          ? "MENUNGGU CS"
          : "ANTRIAN DESAIN",
    };

    if (body.hasilDesain !== undefined) {
      dataUpdate.hasilDesain = body.hasilDesain;
    }

    if (body.catatanRevisi !== undefined) {
      dataUpdate.catatanRevisi = body.catatanRevisi;
    }

    const updatedLead = await prisma.leadOrder.update({
      where: {
        id: params.id,
      },
      data: dataUpdate,
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("UPDATE DESIGN ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal update desain",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}