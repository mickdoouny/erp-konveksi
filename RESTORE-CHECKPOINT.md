# Restore Checkpoint

> **Checkpoint terbaru (Juni 2026, LAN login OK):** baca [`docs/HANDOFF-AGENT-CONTEXT.md`](docs/HANDOFF-AGENT-CONTEXT.md) bagian **CHECKPOINT — Juni 2026**. Operator: [`docs/LAN-OPERATOR-LOGIN.md`](docs/LAN-OPERATOR-LOGIN.md).

---

# Restore Checkpoint — 26 Mei 2026 (sebelum kode hilang)

Titik acuan: pesan di chat agent `d16b5ccf`:

> *"saya mau praktekan dl ke oprator cs dan operator desainer, bagaimana caranya? dengan jaringan 1 router wifi"*

**Sumber restore:** working tree rebuild Yorge (transkrip + Prisma), **bukan** `erp-konveksi-backup` (versi lama, hanya design-approval).

---

## Apakah bisa match checkpoint?

| Jawaban | Keterangan |
|---------|------------|
| **Ya — untuk uji LAN CS + Desainer** | Alur inti rebuild ada dan bisa diuji di Wi-Fi yang sama. |
| **Hampir — untuk admin penuh** | Admin Keuangan, Admin Produksi, cetak SPP, pipeline ada; beberapa fitur sesi panjang (drag-drop Corel di preview, notifikasi sidebar) **belum** dipulihkan. |
| **Tidak 100% byte-identik** | Rebuild tidak pernah di-commit penuh ke git; tidak ada zip/salinan folder lain setelah 16 Mei selain `erp-konveksi-backup` (ditolak). |

---

## Inventaris fitur (ada di checkpoint transkrip)

### Auth & navigasi
- [x] Login demo: `cs`/`cs1`–`cs3`, `desainer`/`desainer1`–`desainer3`, `owner`, `admin`, `keuangan`
- [x] Password demo: `12345`
- [x] Owner dashboard `/owner`
- [x] Redirect per role (`lib/auth.ts`)

### CS — antrian desain
- [x] List `/cs/antrian-desain` (kolom Grup SPP, aksi Menunggu CDR / Input order / Detail)
- [x] Tambah multi-artikel fullscreen `/cs/antrian-desain/tambah`
- [x] Detail `/cs/antrian-desain/[id]` + `DesignPreviewPair` (Desain Awal | Hasil Desain / Desain Revisi)
- [x] ACC konsumen, revisi, kirim ulang ke desainer
- [x] Edit konsumen (sebelum input order)
- [x] Input order fullscreen `/cs/antrian-desain/[id]/input-order` (gate: CDR harus sudah diunggah desainer)
- [x] Redirect setelah simpan order → list antrian
- [x] Klik gambar → `/view/image` + unduh

### Desainer
- [x] Antrian kerja `/desainer/antrian`
- [x] Antrian pasca-ACC `/desainer/antrian-disetujui` (status `MENUNGGU_DP`, dll.)
- [x] Upload CDR: nama file wajib `{artikelId}.cdr` (client + server)

### Admin (alur `USE_FINAL_ORDER_WORKFLOW=true`)
- [x] Admin Keuangan `/admin/keuangan` (validasi DP, pelunasan modal, izin kirim)
- [x] Admin Produksi `/admin/final-orders` (cetak SPP, approve → Setting, guard DP)
- [x] Cetak SPP `/admin/final-orders/[id]/print` (PDF + `window.print()`)
- [x] Siap kirim `/admin/siap-kirim`
- [x] API: `final-orders`, `accounting`, `production-pipeline`, `design-queue`, `cs/antrian-desain`

### Env & flag
- [x] `USE_FINAL_ORDER_WORKFLOW` di `lib/feature-flags.ts`
- [x] Verifikasi: `GET /api/final-orders/workflow` → `{ "enabled": true }`

### Belum / beda dari sesi panjang
- [ ] Tombol salin/unduh di kotak preview (sengaja dihapus per permintaan user di transkrip)
- [ ] Drag-drop paste Corel di preview (`materi-image-transfer`)
- [ ] Komponen terpisah `design-queue-notes-section`, `acc-desain-form-modal` (logika digabung inline)
- [ ] Route lama `/admin/spp/[id]/print` (diganti ke `/admin/final-orders/[id]/print`)
- [ ] Halaman legacy `/leads`, `/designs/list`, `/cs/design-approval` (masih ada, bukan alur utama)

---

## Backup lain di disk (hasil pencarian)

| Lokasi | Tanggal | Dipakai? |
|--------|---------|----------|
| `C:\Users\Jazzy\erp-konveksi` | 28 Mei 2026 | **Ya** — rebuild aktif |
| `C:\Users\Jazzy\erp-konveksi-backup` | 16 Mei 2026 | **Tidak** — hanya modul lama |
| Zip/rar `erp*` di `C:\Users\Jazzy` | — | Tidak ditemukan |
| Folder salinan lain | — | Tidak ditemukan |

---

## Persiapan server (PC utama)

### 1. File `.env`

Salin dari `.env.example` jika belum ada:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/erp_konveksi"
USE_FINAL_ORDER_WORKFLOW=true
```

Lalu:

```powershell
cd C:\Users\Jazzy\erp-konveksi
npx prisma generate
# jika schema DB belum sinkron:
# npx prisma db push
```

**Restart** dev server setelah mengubah `.env`.

### 2. Jalankan untuk LAN

```powershell
npm run dev:lan
```

(setara `next dev --hostname 0.0.0.0 --port 3000`)

### 3. IP server

```powershell
ipconfig
```

Catat **IPv4** adapter Wi-Fi (contoh transkrip: `10.156.44.230` — pakai angka di PC Anda).

### 4. Firewall

Izinkan Node.js / port **3000** pada jaringan **Private** saat popup Windows Firewall.

---

## URL uji LAN (ganti `<IP>` dengan IPv4 server)

| Peran | Login | URL setelah login |
|-------|-------|-------------------|
| **Operator CS** | `cs1` / `12345` | `http://<IP>:3000/cs/antrian-desain` |
| **Operator Desainer** | `desainer1` / `12345` | `http://<IP>:3000/desainer/antrian` |
| Tes koneksi | — | `http://<IP>:3000/login` |

**Localhost (hanya di PC server):**

- Login: http://localhost:3000/login
- CS: http://localhost:3000/cs/antrian-desain
- Desainer: http://localhost:3000/desainer/antrian
- Desainer disetujui (CDR): http://localhost:3000/desainer/antrian-disetujui

---

## Skenario uji 2 operator (Wi-Fi sama)

1. **PC server** — `npm run dev:lan`, biarkan terminal terbuka.
2. **Laptop CS** — buka `http://<IP>:3000/login` → `cs1` / `12345` → **Tambah desain** (multi-artikel jika perlu).
3. **Laptop Desainer** — `desainer1` / `12345` → **Antrian kerja** → unggah hasil desain → kembalikan ke CS.
4. **Laptop CS** — detail antrian → **ACC dari konsumen** → status **Menunggu DP**.
5. **Laptop Desainer** — **Antrian disetujui** → unggah `ART-xxx.cdr` (nama file = ID artikel).
6. **Laptop CS** — **Input order** (tombol aktif setelah CDR ada) → simpan.
7. (Opsional) `keuangan` → validasi DP → `admin` → cetak SPP.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Laptop lain tidak bisa buka URL | Pastikan `--hostname 0.0.0.0`, firewall, satu router Wi-Fi |
| Input order disabled | Desainer belum upload CDR `{artikelId}.cdr` |
| Admin produksi kosong | `USE_FINAL_ORDER_WORKFLOW=true`, CS sudah simpan order, keuangan validasi DP |
| Build/type error route lama | Hapus cache: `Remove-Item -Recurse -Force .next` lalu `npm run dev:lan` |
| Workflow API `enabled: false` | Set env + restart server |

---

## Git (referensi)

- Branch kerja: `2026-05-20-5a67`
- Commit terakhir di git: tema gelap/UI lama — **bukan** snapshot rebuild penuh
- Rebuild checkpoint = **working tree saat ini**, dokumentasi ini

---

*Dibuat otomatis saat restore checkpoint d16b5ccf — 28 Mei 2026.*

---

## Update Juni 2026

- Login LAN (`npm run dev:lan`, cookie `erp_user`) **diverifikasi berjalan** di `192.168.0.16:3000`.
- Handoff agent terkunci di `docs/HANDOFF-AGENT-CONTEXT.md` (branch `2026-05-20-5a67`, uncommitted).
