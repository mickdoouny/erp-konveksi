# Handoff Agent — ERP Konveksi

**Baca ini dulu di chat baru.** Operator cepat (1 halaman): [`docs/OPERATOR-QUICK-START.md`](OPERATOR-QUICK-START.md). Panduan LAN: [`docs/LAN-OPERATOR-LOGIN.md`](LAN-OPERATOR-LOGIN.md). Operator **Router 1** (jauh dari server Router 2): [`docs/TAILSCALE-OPERATOR-ACCESS.md`](TAILSCALE-OPERATOR-ACCESS.md). Alur produksi/keuangan: [`docs/TWO-TRACK-WORKFLOW.md`](TWO-TRACK-WORKFLOW.md).

---

## CHECKPOINT — Juni 2026 (LOCKED)

**Status:** Login LAN **berfungsi** (diverifikasi user: "nash skr bisa"). Jangan ubah alur auth/LAN tanpa permintaan eksplisit.

### Yang sudah jalan (kunci)

| Area | Status |
|------|--------|
| **LAN login** | `npm run build` + `npm run start:lan` → `http://192.168.100.122:3000/login` (ganti IP jika `ipconfig` beda; set `ERP_LAN_HOST`) |
| **Akun demo** | `cs1`/`cs2`/`cs3`, `desainer1`–`desainer3`, password **`12345`** |
| **Sesi** | POST `/api/login` → cookie `erp_user`; form login **selalu** tampil; **Logout & ganti akun** |
| **CS** | Antrian desain + produksi (data scoped per CS) |
| **Desainer** | Antrian, drag-drop, kirim ke CS, upload DTF |
| **Owner** | CRUD operator, DPK AI Command Center (Smart Query; OpenAI belum) |
| **DTF** | Alur revisi: desainer upload; admin produksi order di tahap **JAHIT** |
| **Input order** | Dropdown, deadline picker, penamaan bukti DP |
| **DB** | Di-reset untuk latihan (Supabase) |

### Praktik operator (Wi‑Fi kantor)

| Peran | Login | Password |
|-------|-------|----------|
| CS | `http://192.168.100.122:3000/login` → `cs1` | `12345` |
| Desainer | sama → `desainer1` | `12345` |

Setelah login: CS → `/cs/antrian-desain`; Desainer → `/desainer/antrian`. Verifikasi parity: `npm run verify:lan` (`scripts/verify-lan-parity.mjs`).

### Env penting

```env
USE_FINAL_ORDER_WORKFLOW=true
DATABASE_URL=...          # Supabase (latihan)
OPENAI_API_KEY=           # kosong / pending
ALLOWED_DEV_ORIGINS=      # tambah IP LAN jika berubah
ERP_LAN_HOST=             # opsional, IP server
```

Restart `npm run start:lan` (atau `npm run restart:lan`) setelah ubah `.env`. Verifikasi workflow: `GET /api/final-orders/workflow` → `{ "enabled": true }`. Verifikasi LAN: `npm run verify:lan` + `npm run diagnose:lan`.

### Tailscale — operator Router 1 (Juni 2026)

| Item | Status |
|------|--------|
| Server ERP (Router 2) | Tailscale **v1.98.4**, hostname `server-erp`, IP **`100.92.73.115`** |
| Tailnet | `mickdouny@gmail.com` — MagicDNS `server-erp.tailc9a455.ts.net` |
| PC operator Router 1 | **Belum join** tailnet — install + login Tailscale di tiap PC |
| URL operator (Tailscale) | `http://100.92.73.115:3000/login` |
| Verifikasi server | `.\scripts\check-tailscale-erp.ps1` |
| Panduan lengkap | [`docs/TAILSCALE-OPERATOR-ACCESS.md`](TAILSCALE-OPERATOR-ACCESS.md) |

`.env` sudah memuat origin Tailscale di `ALLOWED_DEV_ORIGINS`. Restart `npm run start:lan` setelah ubah.

### Ditunda (jangan blokir lanjut)

- Integrasi OpenAI API (DPK AI)
- `dev:lan` hanya untuk development lokal admin — operator wajib `start:lan` (production)
- Beberapa peringatan ESLint
- Subnet router Tailscale (`192.168.1.0/24`) — opsional; IP Tailscale langsung cukup

### File kritis — auth LAN

- `middleware.ts`
- `app/api/login/route.ts`, `app/api/logout/route.ts`
- `app/login/**`
- `lib/login-session.ts`
- `hooks/use-auth-guard.ts`
- `next.config.ts` (`allowedDevOrigins`)

### Git

- Branch: **`2026-05-20-5a67`**
- Banyak perubahan rebuild + `.next` **belum di-commit** — checkpoint = working tree + dokumen ini, bukan commit terakhir di remote.

---

## Ringkasan produk

Rebuild ERP **PT. DASA PUTRA KREATIF**:

1. **CS** — antrian desain, multi-artikel, ACC, input order.
2. **Desainer** — antrian kerja + pasca-ACC (CDR `{artikelId}.cdr`, DTF).
3. **Admin Keuangan** — validasi DP, pelunasan, izin kirim.
4. **Admin Produksi** — final order, SPP, pipeline (DTF order di JAHIT).

## Login demo (password: `12345`)

| Grup | Username |
|------|----------|
| Owner | `owner` |
| Admin Produksi | `admin` |
| Admin Keuangan | `keuangan` |
| CS | `cs`, `cs1`, `cs2`, `cs3` |
| Desainer | `desainer`, `desainer1`, `desainer2`, `desainer3` |

## URL per role

| Role | Home |
|------|------|
| CS | `/cs/antrian-desain` |
| Desainer | `/desainer/antrian` |
| Admin Keuangan | `/admin/keuangan` |
| Admin Produksi | `/admin/final-orders` |
| Owner | `/owner` |

## Alur bisnis (singkat)

```
CS tambah desain → Desainer kerja → CS ACC → Desainer CDR/DTF
→ CS input order → Keuangan validasi DP → Produksi (SPP + approve)
→ Pipeline → Siap kirim → Izin kirim
```

## File inti (selain auth LAN)

- Flag: `lib/feature-flags.ts`
- Fork order: `lib/create-final-order-from-design-queue.ts`
- Keuangan: `lib/accounting-service.ts`, `app/api/accounting/*`
- Produksi: `lib/production-pipeline.ts`, `app/api/final-orders/*`
- CS: `app/cs/antrian-desain/**`, `lib/cs-antrian-desain.ts`
- Desainer: `app/desainer/**`, `app/api/design-queue/*`

## Catatan legacy

- Checkpoint restore lama (Mei 2026): [`RESTORE-CHECKPOINT.md`](../RESTORE-CHECKPOINT.md)
- Preview drag-drop Corel penuh / notifikasi sidebar belum dipulihkan
- Halaman legacy (`/leads`, `/designs/list`) masih ada
