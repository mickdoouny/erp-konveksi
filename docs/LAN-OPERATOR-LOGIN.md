# Login operator lewat LAN (Wi?Fi kantor)

Panduan singkat agar CS dan desainer bisa masuk ERP dari HP/laptop di jaringan yang sama dengan PC server. Ringkasan 1 halaman: [`OPERATOR-QUICK-START.md`](OPERATOR-QUICK-START.md).

> **Operator di Router 1, server di Router 2 (Wi?Fi terpisah)?** LAN langsung (`192.168.1.23`) **tidak** menjangkau server baru di `192.168.100.x`. Pakai **Tailscale**: [`docs/TAILSCALE-OPERATOR-ACCESS.md`](TAILSCALE-OPERATOR-ACCESS.md) ? `http://100.92.73.115:3000/login`.


## Mode server untuk operator LAN (penting)

Untuk HP/laptop di Wi-Fi kantor, jalankan **production** (bukan `npm run dev:lan`). Dev mode Next.js bisa memblokir aset JS dari IP LAN ? layar stuck **Memuat...** untuk semua role.

Di PC server (`C:\Users\Jazzy\erp-konveksi`):

```powershell
npm run build
npm run start:lan
```

Pastikan `.env` berisi `ERP_LAN_HOST=192.168.100.122` (sesuaikan IPv4 PC). Operator buka `http://192.168.100.122:3000/login`.


## Prasyarat

1. **PC server** menjalankan **production LAN** (bukan `dev:lan`):
   ```powershell
   npm run build
   npm run start:lan
   ```
   Server mengikat `0.0.0.0:3000`. Operator buka **`http://192.168.100.122:3000/login`**.

2. **Wi?Fi sama** ? HP operator dan PC server harus satu jaringan (mis. router kantor).

3. **Firewall Windows** ? izinkan Node/Next.js pada port **3000** untuk jaringan privat, atau matikan sementara untuk uji.

4. **IP PC** ? cek `ipconfig`. Jangan pakai bookmark IP lama (`192.168.1.23`, `192.168.1.50`).

## Alur login (satu jalur)

1. Buka halaman login di browser (bukan bookmark API).
2. Isi form ? **POST** ke `/api/login` ? server set cookie **`erp_user`** ? redirect ke beranda sesuai role.
3. **Middleware** memblokir halaman tanpa cookie valid.
4. Di client, `readClientSessionUser()` menyamakan cookie ke `localStorage` (untuk guard halaman); cookie tetap sumber kebenaran di server.

**Cookie masih ada dari sesi lama?** `/login` **tidak** lagi otomatis mengarahkan ke antrian CS/desainer. Form login tetap tampil agar operator bisa ganti akun (`cs1` ? `cs2`, dll.). Banner hijau **Sudah login sebagai ?** muncul **setelah halaman dimuat** (client-side) jika cookie `erp_user` masih ada ? HTML awal tetap sama di semua perangkat. **Lanjutkan** ke beranda role, atau **Logout & ganti akun**. Shortcut: `/login?continue=1` langsung ke beranda jika cookie valid.

Jangan pakai bookmark lama ke `/login/session-bridge` ? rute itu sudah tidak dipakai dan akan diarahkan ke `/login`.

## URL untuk operator (MedianSkill / Router 1)

**Satu URL resmi ? admin DAN operator wajib pakai hostname yang sama:**

```
http://192.168.100.122:3000/login
```

> **Admin di PC server:** jangan bandingkan tampilan lewat `http://localhost:3000`. Itu hostname lain ? cookie, cache, dan redirect bisa terasa "beda". Untuk uji parity, admin buka **URL yang sama** dengan operator di atas.

Verifikasi otomatis (tanpa cookie) dari PC server:

```powershell
npm run verify:lan      # scripts/verify-lan-parity.mjs ? HTML byte-identical 127.0.0.1 / localhost / IP LAN
npm run diagnose:lan    # scripts/diagnose-lan-assets.mjs ? semua aset /_next/static/ return 200
```

Keduanya harus **All checks passed** / **All parity checks passed** setelah `npm run build` + `npm run restart:lan`.

| Peran    | Username   | Password demo | URL setelah login        |
|----------|------------|---------------|---------------------------|
| CS       | `cs1`      | `12345`       | `http://192.168.100.122:3000/cs/antrian-desain` |
| CS       | `cs2`      | `12345`       | sama (antrian desain)     |
| Desainer | `desainer1`| `12345`       | `http://192.168.100.122:3000/desainer/antrian` |

**Tampilan login yang benar:** judul **PT. DASA PUTRA KREATIF**, latar gelap, kartu login bergaya neo (bukan halaman putih polos atau layar **Memuat?** tanpa isi).

## Akun demo (password sama)

| Username    | Password | Role     |
|-------------|----------|----------|
| cs1         | 12345    | cs       |
| cs2         | 12345    | cs       |
| desainer1   | 12345    | desainer |

Password demo hanya untuk latihan; ganti saat production.

## Log sukses di terminal server

Setelah login berhasil, di terminal `npm run start:lan (production LAN; jangan `dev:lan` untuk operator)` muncul kira-kira:

```
[login] success cs1 role= cs host= 192.168.100.122:3000
```

Login gagal:

```
[login] failed cs1 status= 401 code= invalid_credentials
```

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|----------------|--------|
| **Tampilan operator beda dengan admin/server** | Bookmark IP lama (`192.168.1.23`), cache browser dari era `dev:lan`, admin buka `localhost` bukan IP LAN, atau build lama tanpa `restart:lan` | Hapus bookmark lama. **Admin dan operator** buka **`http://192.168.100.122:3000/login`**. Jalankan `npm run verify:lan` + `npm run diagnose:lan`. Hard refresh / hapus cache (lihat di bawah). |
| Buka `/login` langsung ke antrian CS | Cookie `erp_user` dari sesi sebelumnya (perilaku lama) | Update kode terbaru: form login tetap tampil + banner sesi. Ganti akun: **Logout & ganti akun** lalu login `cs2` / `desainer1`. |
| Langsung kembali ke login | Cookie `erp_user` tidak ada / username salah | Username demo huruf kecil (`cs1`, `desainer1`). Password `12345`. Keyboard HP boleh kapital huruf pertama ? server menormalkan ke huruf kecil. |
| Layar error / putih setelah login CS | Crash halaman antrian CS (sudah diperbaiki) | Update kode; login ulang `cs1` ? antrian desain harus tampil. |
| Halaman kosong / asset error di LAN | Origin dev tidak diizinkan | `next.config.ts` memuat IP dari `ERP_LAN_HOST` + `ALLOWED_DEV_ORIGINS` (hostname **dan** `hostname:port`). Tambah IP lewat env jika berubah, lalu **restart** `npm run start:lan (production LAN; jangan `dev:lan` untuk operator)`. |
| Login OK tapi layar hitam **Memuat...** | Server masih `dev:lan`, atau cache aset JS/CSS lama di browser operator | Di server: `npm run build` lalu `npm run start:lan`. Di HP: hapus cache situs / hard refresh. |
| `localhost:3000` beda dengan operator | Admin buka `localhost`, operator buka IP LAN | Admin **wajib** buka **`http://192.168.100.122:3000/login`** (bukan localhost). Jalankan `npm run verify:lan` untuk konfirmasi byte-identical. |
| Bookmark `/api/login` atau GET ke API | Bookmark salah | Hapus bookmark; buka **`/login`** dan submit form. |
| `error=session` di URL | Middleware tidak melihat cookie | Login ulang dari `/login`; cek Wi?Fi dan IP. |
| `error=invalid_credentials` | Username/password salah | Lihat tabel akun demo. |
| `error=server_error` | DB operator tidak bisa dihubungi | Pakai akun demo `cs1` / `desainer1` atau perbaiki koneksi DB. |

### Port tidak bisa diakses dari PC lain (ping OK, port gagal)

1. Di **PC server**, pastikan listen di semua interface:
   ```powershell
   netstat -ano | findstr :3000
   ```
   Harus ada `0.0.0.0:3000` atau `[::]:3000` LISTENING setelah `ERP_LAN_BIND_ALL=true` + `npm run start:lan (production LAN; jangan `dev:lan` untuk operator)`.

2. Jalankan firewall (Administrator):
   ```powershell
   cd C:\Users\Jazzy\erp-konveksi
   .\scripts\allow-lan-port-3000.ps1
   ```

3. Dari **PC operator** (mis. `192.168.100.50`):
   ```powershell
   Test-NetConnection 192.168.100.122 -Port 3000
   ```
   `TcpTestSucceeded : True` lalu buka `http://192.168.100.122:3000/login`.

4. Jika masih `False` padahal firewall Windows profil **Disabled**: cek **AP isolation** di router Wi-Fi, antivirus, atau coba port alternatif `ERP_DEV_PORT=3001` di `.env` lalu `.\scripts\allow-lan-port-3000.ps1 -Port 3001`.


| Layar putih setelah login desainer | Crash React di halaman antrian (sudah diperbaiki) | Update kode terbaru; login ulang `desainer1` ? `/desainer/antrian`. |

### Debug sesi (opsional)

Untuk tim IT: buka `http://192.168.100.122:3000/login?debug=1` ? panel cookie/localStorage.

### Tampilan beda ? langkah operator (HP / laptop)

1. Hapus bookmark lama (`192.168.1.23`, `192.168.1.50`, `/login/session-bridge`).
2. Buka URL baru (ketik manual): `http://192.168.100.122:3000/login`
3. Hard refresh: Chrome Android ? ? ? Refresh; Safari iOS ? tarik halaman; Windows ? `Ctrl+Shift+R`.
4. Hapus cache situs untuk host `192.168.100.122` jika masih beda.
5. Logout dulu, login ulang `cs1` / `desainer1`.
6. HP vs laptop admin: layout responsif (sidebar lebih sempit di HP) ? normal, bukan versi berbeda. ? panel menampilkan cookie `erp_user` dan `localStorage`, tanpa mengganggu operator biasa.

### Logout

Tombol keluar di sidebar memanggil `clearClientSession()`:

- menghapus `localStorage.user`
- menghapus cookie `erp_user` di browser
- **POST** `/api/logout` untuk menghapus cookie di respons server

## Uji cepat dari PC server (PowerShell)

Pastikan `npm run start:lan (production LAN; jangan `dev:lan` untuk operator)` sudah jalan:

```powershell
# CS
curl.exe -c c-cs.txt -X POST "http://127.0.0.1:3000/api/login" -H "Content-Type: application/x-www-form-urlencoded" -d "username=cs1&password=12345" -v
curl.exe -b c-cs.txt "http://127.0.0.1:3000/cs/antrian-desain" -I

# Desainer (LAN ? sama seperti operator)
curl.exe -c c-dsn.txt -X POST "http://192.168.100.122:3000/api/login" -H "Content-Type: application/x-www-form-urlencoded" -d "username=desainer1&password=12345" -v
curl.exe -b c-dsn.txt "http://192.168.100.122:3000/desainer/antrian" -I
```

Harapan:

1. POST ? `303` redirect ke `/cs/antrian-desain` dan header `Set-Cookie: erp_user=...`
2. GET dengan `-b c.txt` ? `200` (bukan redirect ke `/login`)

## Keluar / ganti operator

Gunakan **Logout** di sidebar aplikasi, atau **Logout & ganti akun** di halaman `/login`. Keduanya memanggil `clearClientSession()` + **POST** `/api/logout` sehingga cookie `erp_user` hilang dan form login tampil lagi. Jangan hanya menutup tab tanpa logout jika HP dipakai bergantian.


