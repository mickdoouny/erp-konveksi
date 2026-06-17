# ERP Operator — Mulai Cepat

**LAN (Wi-Fi sama):** `http://192.168.100.122:3000/login`  
**Tailscale (Wi-Fi beda):** `http://100.92.73.115:3000/login`

| Peran | Username | Password | Setelah login |
| CS | `cs1` / `cs2` | `12345` | `http://192.168.100.122:3000/cs/antrian-desain` |
| Desainer | `desainer1` | `12345` | `http://192.168.100.122:3000/desainer/antrian` |

**Tampilan beda / stuck Memuat…?** Hapus bookmark lama → hard refresh (`Ctrl+Shift+R` / tarik halaman di HP) → hapus cache situs untuk IP di atas.

**Admin (PC server):** `npm run build` lalu `npm run start:lan` — **jangan** `dev:lan`. Cek: `npm run verify:lan` (`scripts/verify-lan-parity.mjs`).

Panduan lengkap: [`LAN-OPERATOR-LOGIN.md`](LAN-OPERATOR-LOGIN.md)
