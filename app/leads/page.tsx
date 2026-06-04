"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { readStoredUser } from "@/lib/auth";
import { homePathByRole } from "@/lib/auth-redirect";

type UploadedFile = {
  name: string;
  url: string;
};

type Lead = {
  id: string;
  leadCode: string;
  namaKonsumen: string;
  namaArtikel: string;
  noHp: string;
  qty: number;
  totalHarga: number;
  dp: number;
  statusLead: string;
  statusDesain: string;
  statusPembayaran: string;
  materiDesain?: string;
};

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [sendingId, setSendingId] =
    useState("");

  async function fetchLeads() {
    try {
      const response = await fetch(
        "/api/leads"
      );

      const data =
        await response.json();

      setLeads(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = readStoredUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!["cs", "owner"].includes(user.role)) {
      router.push(homePathByRole(user.role));
      return;
    }

    fetchLeads();
  }, [router]);

  async function kirimKeDesain(
    leadId: string
  ) {
    try {
      setSendingId(leadId);

      const res = await fetch(
        `/api/leads/${leadId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            statusLead: "ANTRIAN DESAIN",
          }),
        }
      );

      if (!res.ok) {
        throw new Error("gagal");
      }

      await fetchLeads();
    } catch {
      alert(
        "Gagal mengirim ke antrian desain"
      );
    } finally {
      setSendingId("");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="neo-main flex flex-1 items-center justify-center text-zinc-500">
          Memuat data…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="neo-main flex-1">
      <div className="neo-card mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Lead / Prospek
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Prospek dari CS — kirim ke desain saat siap
            </p>
          </div>

          <a
            href="/orders"
            className="neo-btn-primary inline-block px-5 py-3 text-center text-sm"
          >
            + Input lead
          </a>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950/90">
              <tr className="text-left text-zinc-400">
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Lead
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Konsumen
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Artikel
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Qty
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Total
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  File materi
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Aksi
                </th>

                <th className="p-3 font-semibold uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => {
                let files: UploadedFile[] =
                  [];

                try {
                  files =
                    lead.materiDesain
                      ? JSON.parse(
                          lead.materiDesain
                        )
                      : [];
                } catch {
                  files = [];
                }

                const sl =
                  (lead.statusLead || "")
                    .trim()
                    .toUpperCase();

                const bisaKirimDesain =
                  sl === "PROSPEK";

                return (
                  <tr
                    key={lead.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                  >
                    <td className="p-3 font-semibold text-orange-400">
                      {
                        lead.leadCode
                      }
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-white">
                        {
                          lead.namaKonsumen
                        }
                      </div>

                      <div className="text-sm text-zinc-500">
                        {lead.noHp}
                      </div>
                    </td>

                    <td className="p-3 text-zinc-200">
                      {
                        lead.namaArtikel
                      }
                    </td>

                    <td className="p-3 text-center text-zinc-300">
                      {lead.qty}
                    </td>

                    <td className="p-3 text-zinc-200">
                      Rp{" "}
                      {Number(
                        lead.totalHarga ||
                          0
                      ).toLocaleString(
                        "id-ID"
                      )}
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        {files.length >
                        0 ? (
                          files.map(
                            (
                              file,
                              index
                            ) => (
                              <a
                                key={
                                  index
                                }
                                href={
                                  file.url
                                }
                                target="_blank"
                                className="block text-sm font-semibold text-orange-400 hover:text-orange-300"
                              >
                                {
                                  file.name
                                }
                              </a>
                            )
                          )
                        ) : (
                          <span className="text-sm text-zinc-600">
                            Tidak ada
                            file
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center align-middle">
                      {bisaKirimDesain ? (
                        <button
                          type="button"
                          onClick={() =>
                            kirimKeDesain(
                              lead.id
                            )
                          }
                          disabled={
                            sendingId ===
                            lead.id
                          }
                          className="rounded-lg border border-orange-500/50 bg-orange-950/50 px-3 py-2 text-xs font-semibold text-orange-400 transition hover:border-orange-400 hover:bg-orange-950 disabled:opacity-50"
                        >
                          {sendingId ===
                          lead.id
                            ? "…"
                            : "Kirim ke desain"}
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-600">
                          —
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-zinc-200">
                          {
                            lead.statusLead
                          }
                        </div>

                        <div className="text-sm text-zinc-500">
                          {
                            lead.statusDesain
                          }
                        </div>

                        <div className="text-sm text-zinc-400">
                          {
                            lead.statusPembayaran
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}