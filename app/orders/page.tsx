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

export default function OrdersPage() {
  const router = useRouter();

  const [authOk, setAuthOk] = useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [uploadedFiles, setUploadedFiles] =
    useState<UploadedFile[]>([]);

  const [form, setForm] = useState({
    namaKonsumen: "",
    noHp: "",
    alamat: "",

    namaArtikel: "",
    jenisOrder: "",
    bahan: "",
    jenisKerah: "",
    jenisLengan: "",

    qty: "",
    hargaSatuan: "",
    totalHarga: "",

    dp: "",
    sisaPelunasan: "",

    tanggalDp: "",
    tanggalPelunasan: "",

    catatanDesain: "",

    materiDesain: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

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

    setAuthOk(true);
  }, [router]);

  useEffect(() => {
    const qty = Number(form.qty || 0);

    const hargaSatuan = Number(
      form.hargaSatuan || 0
    );

    const dp = Number(form.dp || 0);

    const totalHarga =
      qty * hargaSatuan;

    const sisaPelunasan =
      totalHarga - dp;

    setForm((prev) => ({
      ...prev,
      totalHarga: String(
        totalHarga
      ),
      sisaPelunasan: String(
        sisaPelunasan
      ),
    }));
  }, [
    form.qty,
    form.hargaSatuan,
    form.dp,
  ]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0)
      return;

    setUploading(true);

    try {
      const formData = new FormData();

      for (const file of Array.from(
        files
      )) {
        formData.append(
          "files",
          file
        );
      }

      const response = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      setUploadedFiles(data.files);

      setForm((prev) => ({
        ...prev,
        materiDesain: JSON.stringify(
          data.files
        ),
      }));

      alert(
        "Upload file berhasil"
      );
    } catch (error) {
      console.error(error);

      alert("Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  if (!authOk) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="neo-main flex flex-1 items-center justify-center text-zinc-500">
          Memuat…
        </div>
      </div>
    );
  }

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      let namaCs = "CS";

      try {
        const u = readStoredUser();
        if (u) {

          namaCs =
            (u.nama && String(u.nama).trim()) ||
            (u.username && String(u.username).trim()) ||
            "CS";
        }
      } catch {
        namaCs = "CS";
      }

      const response = await fetch(
        "/api/leads",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...form,
            namaCs,
          }),
        }
      );

      const data =
        await response.json();

      if (response.ok) {
        alert(
          `Lead berhasil dibuat\nKode: ${data.leadCode}`
        );

        setForm({
          namaKonsumen: "",
          noHp: "",
          alamat: "",

          namaArtikel: "",
          jenisOrder: "",
          bahan: "",
          jenisKerah: "",
          jenisLengan: "",

          qty: "",
          hargaSatuan: "",
          totalHarga: "",

          dp: "",
          sisaPelunasan: "",

          tanggalDp: "",
          tanggalPelunasan: "",

          catatanDesain: "",

          materiDesain: "",
        });

        setUploadedFiles([]);
      } else {
        alert(
          "Gagal membuat lead"
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Terjadi kesalahan"
      );
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="neo-main flex-1">
      <div className="neo-card mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Input lead / prospek
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Input awal dari chat WhatsApp konsumen
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-4 gap-4"
        >
          {/* KONSUMEN */}

          <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/40 p-4 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-orange-400">
              Konsumen
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Nama Konsumen
                </label>

                <input
                  name="namaKonsumen"
                  value={
                    form.namaKonsumen
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nama Konsumen"
                  className="neo-input mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  No WhatsApp
                </label>

                <input
                  name="noHp"
                  value={form.noHp}
                  onChange={
                    handleChange
                  }
                  placeholder="08xxxxxxxxxx"
                  className="neo-input mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Alamat
                </label>

                <input
                  name="alamat"
                  value={
                    form.alamat
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Alamat Konsumen"
                  className="neo-input mt-1"
                />
              </div>
            </div>
          </div>

          {/* DETAIL */}

          <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/40 p-4 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-orange-400">
              Detail order
            </h2>

            <div className="space-y-3">
              <input
                name="namaArtikel"
                value={
                  form.namaArtikel
                }
                onChange={
                  handleChange
                }
                placeholder="Nama Artikel"
                className="neo-input"
              />

              <input
                name="jenisOrder"
                value={
                  form.jenisOrder
                }
                onChange={
                  handleChange
                }
                placeholder="Jenis Order"
                className="neo-input"
              />

              <input
                name="bahan"
                value={form.bahan}
                onChange={
                  handleChange
                }
                placeholder="Jenis Bahan"
                className="neo-input"
              />

              <input
                name="jenisKerah"
                value={
                  form.jenisKerah
                }
                onChange={
                  handleChange
                }
                placeholder="Jenis Kerah"
                className="neo-input"
              />

              <input
                name="jenisLengan"
                value={
                  form.jenisLengan
                }
                onChange={
                  handleChange
                }
                placeholder="Jenis Lengan"
                className="neo-input"
              />
            </div>
          </div>

          {/* PEMBAYARAN */}

          <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/40 p-4 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-orange-400">
              Pembayaran
            </h2>

            <div className="space-y-3">
              <input
                type="number"
                name="qty"
                value={form.qty}
                onChange={
                  handleChange
                }
                placeholder="Quantity"
                className="neo-input"
              />

              <input
                type="number"
                name="hargaSatuan"
                value={
                  form.hargaSatuan
                }
                onChange={
                  handleChange
                }
                placeholder="Harga Satuan"
                className="neo-input"
              />

              <input
                type="number"
                value={
                  form.totalHarga
                }
                readOnly
                placeholder="Total Harga"
                className="neo-input cursor-not-allowed border-zinc-600 bg-zinc-950/80 font-bold text-zinc-300"
              />

              <input
                type="number"
                name="dp"
                value={form.dp}
                onChange={
                  handleChange
                }
                placeholder="DP"
                className="neo-input"
              />

              <input
                type="number"
                value={
                  form.sisaPelunasan
                }
                readOnly
                placeholder="Sisa Pelunasan"
                className="neo-input cursor-not-allowed border-zinc-600 bg-zinc-950/80 font-bold text-zinc-300"
              />
            </div>
          </div>

          {/* DESAIN */}

          <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/40 p-4 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-orange-400">
              Desain
            </h2>

            <div className="space-y-3">
              <input
                type="date"
                name="tanggalDp"
                value={
                  form.tanggalDp
                }
                onChange={
                  handleChange
                }
                className="neo-input"
              />

              <input
                type="date"
                name="tanggalPelunasan"
                value={
                  form.tanggalPelunasan
                }
                onChange={
                  handleChange
                }
                className="neo-input"
              />

              <div>
                <label className="text-sm font-semibold text-zinc-400">
                  Upload materi desain
                </label>

                <input
                  type="file"
                  multiple
                  onChange={
                    handleUpload
                  }
                  className="neo-input mt-1 cursor-pointer bg-zinc-950/60 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-500"
                />

                {uploading && (
                  <p className="mt-2 text-sm text-orange-400">
                    Mengunggah…
                  </p>
                )}

                {uploadedFiles.length >
                  0 && (
                  <div className="mt-2 space-y-2">
                    {uploadedFiles.map(
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
                    )}
                  </div>
                )}
              </div>

              <textarea
                name="catatanDesain"
                value={
                  form.catatanDesain
                }
                onChange={
                  handleChange
                }
                placeholder="Catatan desain"
                className="neo-input min-h-[8rem] resize-y"
              />
            </div>
          </div>

          <div className="col-span-4 mt-2">
            <button
              type="submit"
              className="neo-btn-primary w-full py-4 text-lg"
            >
              Simpan lead / prospek
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}