import { randomUUID } from "crypto"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const vendors = [
    {
      id: "dtf-vendor-001",
      name: "DTF Print Jogja",
      contact: "Budi Santoso",
      phone: "081234567890",
      bankAccount: "BCA 1234567890 a/n Budi Santoso",
      notes: "Vendor DTF reguler",
    },
    {
      id: "dtf-vendor-002",
      name: "Express DTF Solo",
      contact: "Siti Rahayu",
      phone: "081298765432",
      bankAccount: "Mandiri 9876543210 a/n Siti Rahayu",
      notes: "Express 1-2 hari",
    },
  ]

  for (const vendor of vendors) {
    await prisma.dtfVendor.upsert({
      where: { id: vendor.id },
      create: { ...vendor, isActive: true },
      update: vendor,
    })
  }

  console.log(`Seeded ${vendors.length} DTF vendors`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
