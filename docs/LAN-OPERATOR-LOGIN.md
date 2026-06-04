# Login operator lewat LAN (Wi‑Fi kantor)

Panduan singkat agar CS dan desainer bisa masuk ERP dari HP/laptop di jaringan yang sama dengan PC server.

## Prasyarat

1. **PC server** menjalankan dev dengan binding LAN:
   ```bash
   npm run dev:lan
   ```
   Script ini sama dengan `next dev --hostname 0.0.0.0 --port 3000` (lihat `package.json`).

2. **Wi‑Fi sama** — HP operator dan PC server harus satu jaringan (mis. router kantor).

3. **Firewall Windows** — izinkan Node/Next.js pada port **3000** untuk jaringan privat, atau matikan sementara untuk uji.

4. **IP PC** — contoh di dokumentasi ini: `192.168.0.16`. Cek di CMD: `ipconfig` → IPv4 Address.

## Alur login (satu jalur)

1. Buka halaman login di browser (bukan bookmark API).
2. Isi form → **POST** ke `/api/login` → server set cookie **`erp_user`** → redirect ke beranda sesuai role.
3. **Middleware** memblokir halaman tanpa cookie valid.
4. Di client, `readClientSessionUser()` menyamakan cookie ke `localStorage` (untuk guard halaman); cookie tetap sumber kebenaran di server.

**Cookie masih ada dari sesi lama?** `/login` **tidak** lagi otomatis mengarahkan ke antrian CS/desainer. Form login tetap tampil agar operator bisa ganti akun (`cs1` ↔ `cs2`, dll.). Jika masih ingin lanjut dengan akun yang sama: banner hijau **Sudah login sebagai …** → **Lanjutkan**, atau buka `/login?continue=1` (langsung ke beranda role). Untuk ganti operator: **Logout & ganti akun** (hapus cookie + form kosong).

Jangan pakai bookmark lama ke `/login/session-bridge` — rute itu sudah tidak dipakai dan akan diarahkan ke `/login`.

## URL untuk operator

Ganti `192.168.0.16` jika IP PC berbeda.

| Peran    | Username   | Password demo | URL setelah login        |
|----------|------------|---------------|---------------------------|
| CS       | `cs1`      | `12345`       | `http://192.168.0.16:3000/cs/antrian-desain` |
| CS       | `cs2`      | `12345`       | sama (antrian desain)     |
| Desainer | `desainer1`| `12345`       | `http://192.168.0.16:3000/desainer/antrian` |

**Halaman login (wajib untuk masuk):**

```
http://192.168.0.16:3000/login
```

## Akun demo (password sama)

| Username    | Password | Role     |
|-------------|----------|----------|
| cs1         | 12345    | cs       |
| cs2         | 12345    | cs       |
| desainer1   | 12345    | desainer |

Password demo hanya untuk latihan; ganti saat production.

## Log sukses di terminal server

Setelah login berhasil, di terminal `npm run dev:lan` muncul kira-kira:

```
[login] success cs1 role= cs host= 192.168.0.16:3000
```

Login gagal:

```
[login] failed cs1 status= 401 code= invalid_credentials
```

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|----------------|--------|
| Buka `/login` langsung ke antrian CS | Cookie `erp_user` dari sesi sebelumnya (perilaku lama) | Update kode terbaru: form login tetap tampil + banner sesi. Ganti akun: **Logout & ganti akun** lalu login `cs2` / `desainer1`. |
| Langsung kembali ke login | Cookie `erp_user` tidak ada / username salah | Username demo huruf kecil (`cs1`, `desainer1`). Password `12345`. Keyboard HP boleh kapital huruf pertama — server menormalkan ke huruf kecil. |
| Layar error / putih setelah login CS | Crash halaman antrian CS (sudah diperbaiki) | Update kode; login ulang `cs1` → antrian desain harus tampil. |
| Halaman kosong / asset error di LAN | Origin dev tidak diizinkan | `next.config.ts` sudah memuat `192.168.0.16` dan `192.168.0.16:3000` di `allowedDevOrigins`. Tambah IP lewat env `ALLOWED_DEV_ORIGINS` jika IP PC berubah. |
| Bookmark `/api/login` atau GET ke API | Bookmark salah | Hapus bookmark; buka **`/login`** dan submit form. |
| `error=session` di URL | Middleware tidak melihat cookie | Login ulang dari `/login`; cek Wi‑Fi dan IP. |
| `error=invalid_credentials` | Username/password salah | Lihat tabel akun demo. |
| `error=server_error` | DB operator tidak bisa dihubungi | Pakai akun demo `cs1` / `desainer1` atau perbaiki koneksi DB. |
| Layar putih setelah login desainer | Crash React di halaman antrian (sudah diperbaiki) | Update kode terbaru; login ulang `desainer1` → `/desainer/antrian`. |

### Debug sesi (opsional)

Untuk tim IT: buka `http://192.168.0.16:3000/login?debug=1` — panel menampilkan cookie `erp_user` dan `localStorage`, tanpa mengganggu operator biasa.

### Logout

Tombol keluar di sidebar memanggil `clearClientSession()`:

- menghapus `localStorage.user`
- menghapus cookie `erp_user` di browser
- **POST** `/api/logout` untuk menghapus cookie di respons server

## Uji cepat dari PC server (PowerShell)

Pastikan `npm run dev:lan` sudah jalan:

```powershell
# CS
curl.exe -c c-cs.txt -X POST "http://127.0.0.1:3000/api/login" -H "Content-Type: application/x-www-form-urlencoded" -d "username=cs1&password=12345" -v
curl.exe -b c-cs.txt "http://127.0.0.1:3000/cs/antrian-desain" -I

# Desainer (LAN)
curl.exe -c c-dsn.txt -X POST "http://192.168.0.16:3000/api/login" -H "Content-Type: application/x-www-form-urlencoded" -d "username=desainer1&password=12345" -v
curl.exe -b c-dsn.txt "http://192.168.0.16:3000/desainer/antrian" -I
```

Harapan:

1. POST → `303` redirect ke `/cs/antrian-desain` dan header `Set-Cookie: erp_user=...`
2. GET dengan `-b c.txt` → `200` (bukan redirect ke `/login`)

## Keluar / ganti operator

Gunakan **Logout** di sidebar aplikasi, atau **Logout & ganti akun** di halaman `/login`. Keduanya memanggil `clearClientSession()` + **POST** `/api/logout` sehingga cookie `erp_user` hilang dan form login tampil lagi. Jangan hanya menutup tab tanpa logout jika HP dipakai bergantian.
