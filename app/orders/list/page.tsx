"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  noInvoice: string;
  namaKonsumen: string;
  deadline: string | null;
  qty: number;
  totalHarga: number;
  status: string;
};

const STATUS_OPTIONS = [
  "DESAIN",
  "LAYOUT",
  "PRINTING",
  "PREPARE",
  "PRESS",
  "JAHIT",
  "FINISHING",
  "DONE",
  "TERKIRIM",
  "LUNAS",
];

/** Hanya hitam / orange / abu / merah / putih */
function getStatusStyle(status: string) {
  switch (status) {
    case "DESAIN":
    case "LAYOUT":
      return "border-orange-500/40 bg-orange-950/40 text-orange-300";
    case "PRINTING":
    case "PREPARE":
      return "border-zinc-600 bg-zinc-900 text-zinc-200";
    case "PRESS":
      return "border-orange-500/60 bg-zinc-950 text-orange-400";
    case "JAHIT":
      return "border-zinc-500 bg-black text-white";
    case "FINISHING":
      return "border-zinc-600 bg-zinc-800 text-zinc-100";
    case "DONE":
    case "TERKIRIM":
    case "LUNAS":
      return "border-white/25 bg-white/10 text-white";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
  }
}

function isUrgent(deadline: string | null) {
  if (!deadline) return false;

  const today = new Date();
  const deadlineDate = new Date(deadline);

  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime =
    deadlineDate.getTime() - today.getTime();

  const diffDays =
    diffTime / (1000 * 60 * 60 * 24);

  return diffDays <= 2;
}

export default function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    id: string,
    status: string
  ) {
    try {
      const response = await fetch(
        `/api/orders/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        fetchOrders();
      } else {
        alert("Gagal update status");
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="neo-main flex min-h-screen items-center justify-center text-zinc-500">
        Memuat data order…
      </div>
    );
  }

  return (
    <div className="neo-main min-h-screen p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Daftar order
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Status produksi per order
        </p>
      </header>

      <div className="neo-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/90 text-left text-zinc-500">
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Invoice
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Konsumen
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Deadline
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Qty
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Total
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={
                    isUrgent(order.deadline) &&
                    order.status !== "LUNAS"
                      ? "border-b border-red-500/20 bg-red-950/25 hover:bg-red-950/35"
                      : "border-b border-zinc-800/80 hover:bg-zinc-900/40"
                  }
                >
                  <td className="p-3 font-medium text-orange-400">
                    {order.noInvoice}
                  </td>

                  <td className="p-3 text-zinc-200">
                    {order.namaKonsumen}
                  </td>

                  <td className="p-3 text-zinc-400">
                    {order.deadline
                      ? new Date(
                          order.deadline
                        ).toLocaleDateString("id-ID")
                      : "-"}

                    {isUrgent(order.deadline) &&
                      order.status !== "LUNAS" && (
                        <span className="ml-2 text-xs font-bold text-red-500">
                          URGENT
                        </span>
                      )}
                  </td>

                  <td className="p-3 text-center text-zinc-300">
                    {order.qty}
                  </td>

                  <td className="p-3 text-zinc-200">
                    Rp{" "}
                    {order.totalHarga.toLocaleString(
                      "id-ID"
                    )}
                  </td>

                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(
                          order.id,
                          e.target.value
                        )
                      }
                      className={`rounded-lg border p-2 font-bold outline-none focus:ring-2 focus:ring-orange-500/30 ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status}
                          value={status}
                          className="bg-zinc-900 text-zinc-100"
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
