import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateInvoice(
  namaCs: string,
  lastNumber: number
) {
  const cleanName = namaCs
    .replace(/\s+/g, "")
    .toUpperCase();

  const number = String(lastNumber + 1).padStart(
    5,
    "0"
  );

  return `${cleanName}${number}`;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Gagal mengambil order",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    /*
      SEMENTARA
      nanti otomatis dari login session
    */
    const namaCs = "DPK";

    const totalOrder =
      await prisma.order.count();

    const noInvoice = generateInvoice(
      namaCs,
      totalOrder
    );

    const order = await prisma.order.create({
      data: {
        noInvoice,

        namaCs,

        namaKonsumen: body.namaKonsumen,
        alamat: body.alamat,
        noHp: body.noHp,

        tanggalProduksi:
          body.tanggalProduksi
            ? new Date(body.tanggalProduksi)
            : null,

        deadline: body.deadline
          ? new Date(body.deadline)
          : null,

        orderType: body.orderType,
        jenisKerah: body.jenisKerah,
        jenisLengan: body.jenisLengan,
        bahan: body.bahan,

        qty: Number(body.qty),

        hargaSatuan: Number(
          body.hargaSatuan
        ),

        totalHarga: Number(
          body.totalHarga
        ),

        dp: Number(body.dp || 0),

        sisaPelunasan: Number(
          body.sisaPelunasan || 0
        ),

        beratBahan: Number(
          body.beratBahan || 0
        ),

        konsumsiTinta: Number(
          body.konsumsiTinta || 0
        ),

        panjangKertas: Number(
          body.panjangKertas || 0
        ),

        status: "DESAIN",
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Gagal membuat order",
      },
      {
        status: 500,
      }
    );
  }
}