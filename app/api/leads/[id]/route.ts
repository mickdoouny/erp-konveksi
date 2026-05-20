import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lead tidak ditemukan" },
        { status: 400 }
      );
    }

    const data: Prisma.LeadOrderUpdateInput = {};

    if (
      typeof body.statusLead === "string" &&
      body.statusLead.trim().length > 0
    ) {
      data.statusLead = body.statusLead.trim();
    }

    if (
      typeof body.statusDesain === "string" &&
      body.statusDesain.trim().length > 0
    ) {
      const s = body.statusDesain.trim();
      data.statusDesain = s;
      data.approvedDesignAt =
        s === "APPROVED" ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada field yang diupdate",
        },
        { status: 400 }
      );
    }

    const updatedLead = await prisma.leadOrder.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error("PATCH LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal update status lead",
      },
      { status: 500 }
    );
  }
}