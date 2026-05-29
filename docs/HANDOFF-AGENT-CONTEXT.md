# Handoff Agent — ERP Konveksi (Rebuild)

## Ringkasan

Rebuild ERP konveksi untuk **PT. DASA PUTRA KREATIF** dengan alur utama:

1. **CS** — antrian desain (`/cs/antrian-desain`), tambah multi-artikel, detail preview ganda, ACC konsumen, input order.
2. **Desainer** — antrian kerja + antrian pasca-ACC (unggah CDR `{artikelId}.cdr`).
3. **Admin Keuangan** — validasi DP, pelunasan, permintaan izin kirim.
4. **Admin Produksi** — antrian final order, cetak SPP, setujui ke Setting, lanjut pipeline.

## Login demo (password semua: `12345`)

| Grup | Username |
|------|----------|
| Owner | `owner` |
| Admin Produksi | `admin` |
| Admin Keuangan | `keuangan` |
| CS | `cs`, `cs1`, `cs2`, `cs3` |
| Desainer | `desainer`, `desainer1`, `desainer2`, `desainer3` |

## Env wajib

```env
USE_FINAL_ORDER_WORKFLOW=true
DATABASE_URL=...
```

Restart `npm run dev` setelah mengubah `.env`.

Verifikasi: `GET /api/final-orders/workflow` → `{ "enabled": true }`.

## URL per role

| Role | Home |
|------|------|
| CS | `/cs/antrian-desain` |
| Desainer | `/desainer/antrian` |
| Admin Keuangan | `/admin/keuangan` |
| Admin Produksi | `/admin/final-orders` |
| Owner | `/owner` (+ akses modul admin dari sidebar) |

## Alur bisnis (singkat)

```
CS tambah desain → Desainer kerja → CS ACC konsumen → Desainer unggah CDR
→ CS input order → Admin Keuangan validasi DP → Admin Produksi (SPP + approve)
→ Pipeline produksi → Siap kirim → Admin Keuangan izin kirim
```

## File inti

- Auth: `lib/auth.ts`
- Flag: `lib/feature-flags.ts`
- Fork order: `lib/create-final-order-from-design-queue.ts`
- Keuangan: `lib/accounting-service.ts`, `app/api/accounting/*`
- Produksi: `lib/production-pipeline.ts`, `app/api/final-orders/*`, `app/api/production-pipeline/*`
- CS: `app/cs/antrian-desain/**`, `lib/cs-antrian-desain.ts`, `lib/cs-input-order.ts`
- Desainer: `app/desainer/**`, `app/api/design-queue/*`

## Catatan restore

Versi rebuild sebelumnya banyak berada di working tree tanpa commit penuh. Restore ini membangun ulang modul dari skema Prisma + transkrip agent `d16b5ccf`.

Perbedaan yang mungkin masih ada vs sesi panjang:

- Preview gambar (salin/unduh/drag-drop) belum dipulihkan penuh
- Notifikasi sidebar / Forge belum ada
- Halaman legacy (`/leads`, `/designs/list`) masih ada untuk kompatibilitas
