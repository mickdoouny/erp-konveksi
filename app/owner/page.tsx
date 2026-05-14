import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function OwnerDashboard() {
  const totalReport = await prisma.report.count()

  const totalQty = await prisma.report.aggregate({
    _sum: {
      qtySelesai: true,
    },
  })

  const reportTerbaru = await prisma.report.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  })

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Owner</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-gray-500">Total Report</h2>
          <p className="text-3xl font-bold mt-2">{totalReport}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-gray-500">Total Qty Selesai</h2>
          <p className="text-3xl font-bold mt-2">
            {totalQty._sum.qtySelesai || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-gray-500">Produksi Berjalan</h2>
          <p className="text-3xl font-bold mt-2">{totalReport}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-gray-500">Order Telat</h2>
          <p className="text-3xl font-bold mt-2 text-red-500">0</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Report Terbaru</h2>

        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Invoice</th>
              <th className="border p-2 text-left">Divisi</th>
              <th className="border p-2 text-left">Qty</th>
              <th className="border p-2 text-left">Kendala</th>
              <th className="border p-2 text-left">Tanggal</th>
            </tr>
          </thead>

          <tbody>
            {reportTerbaru.map((report) => (
              <tr key={report.id}>
                <td className="border p-2">{report.invoice}</td>
                <td className="border p-2">{report.divisi}</td>
                <td className="border p-2">{report.qtySelesai}</td>
                <td className="border p-2">{report.kendala}</td>
                <td className="border p-2">
                  {report.createdAt.toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}