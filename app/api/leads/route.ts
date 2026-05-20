import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateLeadCode(lastNumber: number) {
  const number = String(lastNumber + 1).padStart(5, "0");
  return `LEAD${number}`;
}

export async function GET() {
  try {
    const leads = await prisma.leadOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET LEADS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data lead" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const namaCsRaw = body.namaCs;
    const namaCs =
      typeof namaCsRaw === "string" &&
      namaCsRaw.trim().length > 0
        ? namaCsRaw.trim()
        : "CS";

    const totalLead =
      await prisma.leadOrder.count();

    const leadCode =
      generateLeadCode(totalLead);

    const qty = Number(body.qty || 0);

    const hargaSatuan = Number(
      body.hargaSatuan || 0
    );

    const dp = Number(body.dp || 0);

    const totalHarga =
      qty * hargaSatuan;

    const sisaPelunasan =
      totalHarga - dp;

    const lead =
      await prisma.leadOrder.create({
        data: {
          leadCode,

          namaCs,

          namaKonsumen:
            body.namaKonsumen,

          noHp: body.noHp,

          alamat: body.alamat || "",

          namaArtikel:
            body.namaArtikel,

          jenisOrder:
            body.jenisOrder || "",

          bahan:
            body.bahan || "",

          jenisKerah:
            body.jenisKerah || "",

          jenisLengan:
            body.jenisLengan || "",

          qty,

          catatanDesain:
            body.catatanDesain || "",

          materiDesain:
            body.materiDesain || "",

          hargaSatuan,

          totalHarga,

          dp,

          sisaPelunasan,

          tanggalDp:
            body.tanggalDp
              ? new Date(
                  body.tanggalDp
                )
              : null,

          tanggalPelunasan:
            body.tanggalPelunasan
              ? new Date(
                  body.tanggalPelunasan
                )
              : null,

          statusLead:
            "PROSPEK",

          statusDesain:
            "BELUM MASUK DESAIN",

          statusPembayaran:
            dp > 0
              ? "DP INPUT"
              : "BELUM DP",

          messages: {
            create: {
              senderRole: "CS",

              senderName: namaCs,

              message:
                body.catatanDesain ||
                "Lead/prospek dibuat",

              fileUrl:
                body.materiDesain ||
                null,
            },
          },
        },

        include: {
          messages: true,
        },
      });

    return NextResponse.json(lead);
  } catch (error) {
    console.error(
      "POST LEAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Gagal membuat lead",
      },
      {
        status: 500,
      }
    );
  }
}