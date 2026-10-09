# Hoshizora: Living Days — AI Edition

Game life-simulation RPG berbahasa Indonesia. **AI wajib aktif; tidak ada mode simulasi lokal/fallback.** Tindakan dan percakapan NPC dikirim ke OpenAI melalui backend Node.js. Save permainan saat ini tersimpan di browser yang sama (Local Storage).

## Cara menjalankan di komputer

Persyaratan: Node.js 18+ dan API key OpenAI yang aktif dengan akses API/billing yang tersedia.

### Windows PowerShell
```powershell
$env:OPENAI_API_KEY="API_KEY_MILIKMU"
$env:OPENAI_MODEL="gpt-4.1-mini"
npm start
```

### macOS / Linux
```bash
export OPENAI_API_KEY="API_KEY_MILIKMU"
export OPENAI_MODEL="gpt-4.1-mini"
npm start
```

Buka `http://localhost:3000`. Jangan membuka `index.html` langsung dari file manager; game membutuhkan backend `/api/turn`.

## Pasang sebagai website online (bisa dibuka dari HP)

Proyek ini menyertakan `render.yaml` untuk mempermudah deployment ke Render.

1. Unduh dan ekstrak ZIP proyek ini.
2. Masuk atau buat akun GitHub, lalu buat repository baru, misalnya `hoshizora-living-days`.
3. Unggah isi folder proyek ke repository (file `index.html`, `server.js`, `package.json`, dan `render.yaml` harus berada di root repository, bukan di folder bertingkat tambahan).
4. Masuk ke Render dan pilih **New → Blueprint** (atau sambungkan repository lalu buat Web Service dengan runtime Node).
5. Pilih repository GitHub tadi. Jika menggunakan Blueprint, Render membaca `render.yaml`.
6. Di pengaturan Environment, isi `OPENAI_API_KEY` dengan API key milikmu. Jangan masukkan key ke GitHub, HTML, atau bagikan ke orang lain. `OPENAI_MODEL` sudah diset ke `gpt-4.1-mini`, dan bisa diubah jika model itu tidak tersedia untuk akun API-mu.
7. Deploy dan tunggu sampai status layanan menunjukkan berhasil.
8. Buka alamat HTTPS yang diberikan Render melalui Chrome di HP. Buka menu Pengaturan & AI → Periksa koneksi AI.

Catatan: hosting gratis dapat tidur setelah tidak aktif dan memerlukan waktu untuk bangun. Ketentuan/kuota hosting dan biaya penggunaan API dapat berubah. AI memerlukan internet dan API key aktif; website tidak akan beralih ke simulasi lokal bila AI gagal.

## API
- `GET /api/health` — status backend dan apakah API key tersedia; nilai rahasia tidak dikirim ke browser.
- `POST /api/turn` — memproses aksi game lewat OpenAI Responses API.

## Batasan versi ini
- Save tersimpan di Local Storage browser/perangkat, belum disinkronkan lintas perangkat.
- Sebelum membuka layanan publik luas, tambahkan rate limiting dan mekanisme perlindungan biaya/penyalahgunaan.
- Jika koneksi AI/API gagal, game menampilkan error; tidak ada fallback lokal.
