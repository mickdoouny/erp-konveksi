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

    const updatedOrder = await prisma.order.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);

    return NextResponse.json(
      {
        message: "Gagal update status",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}