import { Prisma } from "@prisma/client"

function stripPrismaNoise(message: string): string {
  return message
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.includes("__TURBOPACK") &&
        !line.includes(".next\\dev\\server") &&
        !/^[→\s\d]+(\||\.\.\.)/.test(line)
    )
    .join(" ")
    .trim()
}

/** User-visible message from an API route catch block (server logs keep full error). */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2028") {
      return "Operasi database timeout saat menyimpan order. Coba lagi; jika berulang, hubungi admin."
    }
    if (error.code === "P2022") {
      return "Skema database belum sinkron. Jalankan prisma migrate deploy lalu coba lagi."
    }
    if (error.code === "P1001") {
      return "Tidak dapat terhubung ke database. Periksa koneksi internet lalu coba lagi."
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Tidak dapat terhubung ke database. Periksa koneksi internet lalu coba lagi."
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message

    if (msg.includes("Can't reach database server")) {
      return "Tidak dapat terhubung ke database. Periksa koneksi internet lalu coba lagi."
    }

    if (
      msg.includes("Unknown argument") ||
      msg.includes("Unknown field") ||
      msg.includes("Invalid `prisma.finalOrder.create()`")
    ) {
      return "Prisma client belum di-update. Stop dev server, jalankan npx prisma generate, lalu restart."
    }

    if (msg.includes("Invalid `prisma.")) {
      const cleaned = stripPrismaNoise(msg)
      if (cleaned.includes("Can't reach database server")) {
        return "Tidak dapat terhubung ke database. Periksa koneksi internet lalu coba lagi."
      }
      if (cleaned.length > 0 && cleaned.length <= 280) {
        return cleaned
      }
    }

    const cleaned = stripPrismaNoise(msg)
    if (cleaned.length > 0 && cleaned.length <= 280) {
      return cleaned
    }
  }

  return fallback
}
