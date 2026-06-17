# Akses operator lewat Tailscale (Router 1 → Router 2)

Panduan ini melengkapi [`LAN-OPERATOR-LOGIN.md`](LAN-OPERATOR-LOGIN.md) dan [`OPERATOR-QUICK-START.md`](OPERATOR-QUICK-START.md) untuk kasus **operator di Router 1** dan **server ERP di Router 2** — dua jaringan Wi‑Fi terpisah yang tidak bisa saling ping lewat IP LAN (`192.168.1.x`).

Tailscale membuat jaringan virtual pribadi (tailnet). Setelah PC operator dan laptop server sama‑sama masuk tailnet yang sama, operator membuka ERP lewat **IP Tailscale** server, bukan IP Wi‑Fi lokal server.

---

## Status setup (Juni 2026)

| Item | Status |
|------|--------|
| Tailscale di laptop server ERP | **Terpasang** v1.98.4, login `mickdouny@gmail.com` |
| Nama mesin | `server-erp` |
| IP Tailscale server | `100.92.73.115` |
| MagicDNS | `server-erp.tailc9a455.ts.net` |
| Subnet router / exit node | Belum dipakai (tidak wajib) |
| PC operator Router 1 | **Belum** — install + login Tailscale di setiap PC |
| `tailscale serve` / Funnel | Tidak dipakai (akses langsung `:3000`) |

**URL login operator (setelah Tailscale aktif di kedua sisi):**

```
http://100.92.73.115:3000/login
```

atau (MagicDNS, jika DNS Tailscale aktif di PC operator):

```
http://server-erp:3000/login
```

Akun demo sama: `cs1` / `desainer1`, password `12345`.

---

## Kenapa Tailscale?

```
Router 1 (operator)          Router 2 (server ERP)
   192.168.1.5                   192.168.1.23
        |                               |
   [Wi‑Fi terpisah — tidak routing LAN langsung]
        |                               |
        +-------- Tailscale tailnet -----+
                    100.x.x.x
```

Tanpa VPN site‑to‑site di router fisik, IP LAN server **tidak** bisa dijangkau dari Router 1. Tailscale menghubungkan perangkat lewat internet dengan enkripsi WireGuard — **tanpa ubah konfigurasi router**.

---

## Bagian A — Server ERP (Router 2) — sudah sebagian

### 1. Tailscale terpasang

Verifikasi di PowerShell:

```powershell
tailscale version
tailscale status
```

Harapan: baris `100.92.73.115  server-erp  ...  windows`.

### 2. ERP server (production LAN)

```powershell
cd C:\Users\Jazzy\erp-konveksi
npm run build
npm run start:lan
```

Pastikan `.env` berisi:

```env
ERP_LAN_HOST=192.168.100.122
ERP_LAN_BIND_ALL=true
ALLOWED_DEV_ORIGINS=...http://100.92.73.115:3000,http://server-erp:3000...
```

`ERP_LAN_BIND_ALL=true` mengikat `0.0.0.0:3000` sehingga port 3000 juga menerima koneksi dari interface Tailscale.

Restart `npm run start:lan` (atau `npm run restart:lan`) setelah ubah `.env`. Verifikasi: `npm run verify:lan` (`scripts/verify-lan-parity.mjs`).

### 3. Firewall Windows

Jalankan sekali (Administrator):

```powershell
cd C:\Users\Jazzy\erp-konveksi
.\scripts\allow-lan-port-3000.ps1
```

Tailscale juga menambah aturan `Tailscale-In` sendiri.

### 4. Cek dari server

```powershell
.\scripts\check-tailscale-erp.ps1
```

---

## Bagian B — Setiap PC operator (Router 1)

### 1. Install Tailscale

- Download: https://tailscale.com/download/windows
- Install seperti aplikasi biasa.

### 2. Login ke tailnet yang sama

- Gunakan **akun Tailscale yang sama** dengan server (`mickdouny@gmail.com`), **atau**
- Di admin console https://login.tailscale.com/admin/machines → **Invite** → kirim link ke operator → mereka login dengan Google/Microsoft/email sendiri (masih satu tailnet).

### 3. Verifikasi koneksi

Di PC operator (PowerShell):

```powershell
tailscale status
# Harus muncul server-erp dengan IP 100.92.73.115

ping 100.92.73.115

Test-NetConnection 100.92.73.115 -Port 3000
# TcpTestSucceeded : True (saat npm run start:lan jalan di server)
```

### 4. Buka ERP

Browser:

```
http://100.92.73.115:3000/login
```

Login `cs1` atau `desainer1`, password `12345`.

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| `tailscale status` hanya 1 mesin | Operator belum install/login | Ulangi Bagian B |
| Ping `100.92.73.115` gagal | Tailscale belum connected / akun beda tailnet | Cek login; pastikan satu admin console |
| Ping OK, port 3000 gagal | `npm run start:lan` mati atau firewall | `npm run build` + `npm run start:lan`; jalankan `allow-lan-port-3000.ps1` |
| Login OK, halaman putih / asset error | Build lama atau cache browser | `npm run restart:lan`; operator hapus cache; `npm run diagnose:lan` |
| MagicDNS `server-erp` tidak resolve | DNS Tailscale dimatikan di PC operator | Pakai IP `100.92.73.115` atau `tailscale set --accept-dns=true` |
| Ingin akses LAN `192.168.1.23` dari operator | Butuh subnet router | Lanjutan lanjut: `tailscale up --advertise-routes=192.168.1.0/24` + approve di admin (opsional) |

### Debug cepat (server)

```powershell
.\scripts\check-tailscale-erp.ps1 -Verbose
```

### Debug cepat (operator)

```powershell
tailscale ping server-erp
curl.exe -I "http://100.92.73.115:3000/login"
```

---

## Opsi lanjutan (belum diperlukan)

- **Subnet router** — iklankan `192.168.1.0/24` dari server agar operator bisa pakai `http://192.168.1.23:3000` lewat Tailscale (perlu approve di https://login.tailscale.com/admin/machines).
- **Tailscale Serve** — reverse proxy HTTPS; tidak dipakai untuk latihan dev `:3000`.
- **Exit node** — tidak diperlukan untuk akses ERP saja.

---

## Referensi

- Admin console: https://login.tailscale.com/admin/machines
- Panduan LAN same‑Wi‑Fi: [`LAN-OPERATOR-LOGIN.md`](LAN-OPERATOR-LOGIN.md)
- Handoff agent: [`HANDOFF-AGENT-CONTEXT.md`](HANDOFF-AGENT-CONTEXT.md)
