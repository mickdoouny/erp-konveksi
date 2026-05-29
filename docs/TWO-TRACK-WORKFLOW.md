# Two-Track Workflow (Produksi + Keuangan)

Setelah CS menekan **Simpan order** pada `/cs/antrian-desain/[id]/input-order` dengan `USE_FINAL_ORDER_WORKFLOW=true`:

## Track 1 — Admin Produksi

- Membuat `FinalOrder` + `ProductionPipeline` (status awal `ADMIN_PRODUKSI`, pending).
- Muncul di `/admin/final-orders` **setelah** Admin Keuangan memvalidasi DP.
- Aksi: **Cetak SPP** (`/admin/final-orders/[id]/print`), **Setujui → Setting**, lanjut tahap pipeline.
- Siap kirim: `/admin/siap-kirim` → ajukan izin kirim.

## Track 2 — Admin Keuangan

- Membuat `AccountingTransaction` (status `MENUNGGU_DP`).
- Antrian di `/admin/keuangan`:
  - **Validasi DP** → `paymentStatus` menjadi `DP_TERIMA` atau `LUNAS`
  - **Catat pelunasan** (aman, tidak melebihi sisa)
  - **Permintaan Izin Kirim** setelah pelunasan

## Gate penting

| Gate | Aturan |
|------|--------|
| Input order CS | Wajib ada `fileDesainProduksi` (CDR) |
| CDR desainer | Nama file = `{artikelId}.cdr` |
| Admin Produksi approve | DP sudah divalidasi (`paymentStatus` ≠ `MENUNGGU_DP`) |
| Izin kirim | Pelunasan lunas / DP dikecualikan |

## CS status setelah validasi DP

`DesignQueueItem.statusDesain` tetap `DISETUJUI_CS`, tetapi label UI menampilkan **Menunggu Admin Produksi** jika accounting sudah tervalidasi.
