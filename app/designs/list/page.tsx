"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { homePathByRole } from "@/lib/auth-redirect";
import { isInDesignerQueue } from "@/lib/designer-queue";

type UploadedFile = {
  name: string;
  url: string;
};

type Lead = {
  id: string;
  leadCode: string;
  namaKonsumen: string;
  namaArtikel: string;
  qty: number;
  bahan: string;
  jenisKerah: string;
  jenisLengan: string;
  catatanDesain: string;
  materiDesain?: string;
  hasilDesain?: string;
  catatanRevisi?: string;
  statusLead?: string;
  statusDesain: string;
};

export default function DesignsQueuePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState("");
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function fetchLeads() {
    const response = await fetch("/api/leads");
    const data = await response.json();
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);

    setUserRole(user.role);

    if (user.role === "desainer") {
      router.replace("/desainer/antrian");
      return;
    }

    if (!["desainer", "owner"].includes(user.role)) {
      router.push(homePathByRole(user.role));
      return;
    }

    fetchLeads();
  }, [router]);

  function parseFiles(fileData: any): UploadedFile[] {
    try {
      if (!fileData) return [];
      const parsed = JSON.parse(fileData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function uploadDesignFiles(
    leadId: string,
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;

    setUploadingId(leadId);

    try {
      const formData = new FormData();

      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        alert("Gagal upload file desain");
        return;
      }

      const updateResponse = await fetch(`/api/designs/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hasilDesain: JSON.stringify(uploadData.files),
          statusDesain: "HASIL DESAIN DIUPLOAD",
        }),
      });

      if (updateResponse.ok) {
        alert("Hasil desain berhasil diupload");
        fetchLeads();
      } else {
        alert("Gagal menyimpan hasil desain");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan upload");
    } finally {
      setUploadingId("");
    }
  }

  async function updateStatus(
    id: string,
    status: string,
    catatanRevisi = ""
  ) {
    const response = await fetch(`/api/designs/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statusDesain: status,
        catatanRevisi,
      }),
    });

    if (response.ok) {
      fetchLeads();
    } else {
      alert("Gagal update status");
    }
  }

  const queueLeads =
    showAllLeads && userRole === "owner"
      ? leads
      : leads.filter(isInDesignerQueue);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="neo-main flex flex-1 items-center justify-center text-zinc-500">
          Memuat…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="neo-main flex-1">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Antrian desainer
        </h1>

        <p className="mb-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Upload hasil desain / revisi lalu kirim ke CS. Hanya lead yang sudah
          dikirim CS ke desain atau sedang dikerjakan.
        </p>

        {userRole === "owner" ? (
          <label className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              className="size-4 rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-orange-500/30"
              checked={showAllLeads}
              onChange={(e) =>
                setShowAllLeads(e.target.checked)
              }
            />
            Tampilkan semua lead
          </label>
        ) : (
          <div className="mb-6" />
        )}

        {queueLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-12 text-center">
            <p className="mb-2 text-lg font-semibold text-white">
              Antrian kosong
            </p>
            <p className="text-sm text-zinc-500">
              Belum ada lead di antrian desain. Minta CS kirim dari menu Lead /
              Prospek dengan tombol &quot;Kirim ke desain&quot;.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
          {queueLeads.map((lead) => {
            const materiFiles = parseFiles(lead.materiDesain);
            const hasilFiles = parseFiles(lead.hasilDesain);

            return (
              <div
                key={lead.id}
                className="neo-card p-5 md:p-6"
              >
                <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {lead.namaKonsumen}
                    </h2>
                    <p className="text-zinc-500">{lead.leadCode}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Status lead: {lead.statusLead ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-500/40 bg-orange-950/40 px-4 py-2 text-sm font-bold text-orange-300">
                    {lead.statusDesain}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="mb-3 font-bold text-orange-400/90">
                      Detail order
                    </h3>
                    <p className="text-zinc-300">Artikel: {lead.namaArtikel}</p>
                    <p className="text-zinc-300">Qty: {lead.qty}</p>
                    <p className="text-zinc-300">Bahan: {lead.bahan}</p>
                    <p className="text-zinc-300">Kerah: {lead.jenisKerah}</p>
                    <p className="text-zinc-300">Lengan: {lead.jenisLengan}</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="mb-3 font-bold text-orange-400/90">
                      Catatan CS
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-zinc-400">
                      {lead.catatanDesain || "-"}
                    </p>

                    {lead.catatanRevisi && (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-red-200">
                        <div className="font-bold text-red-400">
                          Catatan revisi
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm">
                          {lead.catatanRevisi}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="mb-3 font-bold text-orange-400/90">
                      File materi CS
                    </h3>

                    <div className="space-y-2">
                      {materiFiles.length > 0 ? (
                        materiFiles.map((file, index) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            className="block text-sm font-semibold text-orange-400 hover:text-orange-300"
                          >
                            {file.name}
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-600">Tidak ada file</p>
                      )}
                    </div>

                    <h3 className="mb-3 mt-5 font-bold text-orange-400/90">
                      Hasil desain / revisi
                    </h3>

                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        uploadDesignFiles(lead.id, e.target.files)
                      }
                      className="neo-input cursor-pointer bg-zinc-950/60 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />

                    {uploadingId === lead.id && (
                      <p className="mt-2 text-sm text-orange-400">
                        Mengunggah…
                      </p>
                    )}

                    <div className="mt-3 space-y-2">
                      {hasilFiles.length > 0 ? (
                        hasilFiles.map((file, index) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            className="block text-sm font-semibold text-zinc-200 hover:text-white"
                          >
                            {file.name}
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-600">
                          Belum ada hasil desain
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <h3 className="mb-3 font-bold text-orange-400/90">
                      Progress
                    </h3>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(lead.id, "PROSES DESAIN")
                        }
                        className="w-full rounded-xl border border-zinc-600 bg-zinc-950 py-2.5 font-bold text-zinc-200 transition hover:border-orange-500/50 hover:text-orange-400"
                      >
                        Proses desain
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(lead.id, "REVISI DIPROSES")
                        }
                        className="w-full rounded-xl bg-orange-600 py-2.5 font-bold text-white shadow-[0_0_20px_-8px_rgba(234,88,12,0.6)] transition hover:bg-orange-500"
                      >
                        Proses revisi
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(lead.id, "KIRIM KE CS")
                        }
                        className="neo-btn-primary w-full py-2.5 text-sm"
                      >
                        Kirim ke CS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
    </div>
  );
}