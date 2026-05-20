"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { homePathByRole } from "@/lib/auth-redirect";

type LeadItem = {
  id: string;
  leadCode?: string;
  namaCs?: string;
  namaKonsumen?: string;
  namaArtikel?: string;
  statusDesain?: string;
  catatanDesain?: string;
  catatanRevisi?: string;
  fileMockup?: string;
  fileFinalDesain?: string;
  approvedDesignAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      const res = await fetch("/api/leads", {
        cache: "no-store",
      });

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.leads)
            ? data.leads
            : [];

      setItems(list);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusDesain: status,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal update status");
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Gagal update status");
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);

    if (!["cs", "owner"].includes(user.role)) {
      router.push(homePathByRole(user.role));
      return;
    }

    loadData();
  }, [router]);

  const waiting = items.filter((item) => {
    const status = (item.statusDesain || "").toLowerCase();

    return (
      status.includes("belum") ||
      status.includes("pending") ||
      status.includes("review") ||
      status.includes("proses")
    );
  });

  const approved = items.filter((item) => {
    const status = (item.statusDesain || "").toLowerCase();

    return (
      status.includes("approve") ||
      status.includes("approved")
    );
  });

  const revision = items.filter((item) => {
    const status = (item.statusDesain || "").toLowerCase();

    return (
      status.includes("revisi") ||
      status.includes("revision")
    );
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="neo-main flex-1">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Approval desain
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Persetujuan desain konsumen sebelum produksi.
          </p>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <DashboardCard
            title="Menunggu approval"
            value={waiting.length}
            accent="orange"
          />

          <DashboardCard
            title="Disetujui"
            value={approved.length}
            accent="white"
          />

          <DashboardCard
            title="Revisi"
            value={revision.length}
            accent="red"
          />
        </div>

        <div className="neo-card p-5 md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-white">
              Data approval
            </h2>

            <button
              type="button"
              onClick={loadData}
              className="rounded-lg border border-orange-500/50 bg-orange-950/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:border-orange-400 hover:bg-orange-950/70"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
              Memuat data…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
              Belum ada data design approval.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      Lead
                    </th>
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      Artikel
                    </th>
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      CS
                    </th>
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      Status
                    </th>
                    <th className="p-3 font-semibold uppercase tracking-wide">
                      Tanggal
                    </th>
                    <th className="p-3 text-center font-semibold uppercase tracking-wide">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="p-3 font-medium text-orange-400">
                        {item.leadCode}
                      </td>

                      <td className="p-3 text-zinc-200">
                        {item.namaKonsumen}
                      </td>

                      <td className="p-3 text-zinc-300">
                        {item.namaArtikel}
                      </td>

                      <td className="p-3 text-zinc-400">
                        {item.namaCs}
                      </td>

                      <td className="p-3">
                        <StatusBadge
                          status={
                            item.statusDesain ||
                            "BELUM MASUK DESAIN"
                          }
                        />
                      </td>

                      <td className="p-3 text-zinc-500">
                        {item.createdAt
                          ? new Date(
                              item.createdAt,
                            ).toLocaleDateString("id-ID")
                          : "-"}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(item.id, "APPROVED")
                            }
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateStatus(item.id, "REVISI")
                            }
                            className="rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-950/80"
                          >
                            Revisi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: "orange" | "white" | "red";
}) {
  const border =
    accent === "orange"
      ? "border-orange-500/40 shadow-[0_0_40px_-20px_rgba(234,88,12,0.5)]"
      : accent === "red"
        ? "border-red-500/40 shadow-[0_0_40px_-20px_rgba(220,38,38,0.35)]"
        : "border-zinc-600/60";

  const valueClass =
    accent === "orange"
      ? "bg-gradient-to-br from-orange-300 to-orange-600 bg-clip-text text-transparent"
      : accent === "red"
        ? "text-red-500"
        : "text-white";

  return (
    <div
      className={`neo-card border p-5 ${border}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </p>

      <h2 className={`mt-2 text-4xl font-bold ${valueClass}`}>
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const lower = status.toLowerCase();

  let className =
    "border border-zinc-600 bg-zinc-900/80 text-zinc-300";

  let label = status;

  if (
    lower.includes("approve") ||
    lower.includes("approved")
  ) {
    className =
      "border border-white/25 bg-white/10 text-white";

    label = "Approved";
  }

  if (
    lower.includes("revisi") ||
    lower.includes("revision")
  ) {
    className =
      "border border-red-500/40 bg-red-950/50 text-red-400";

    label = "Revisi";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
