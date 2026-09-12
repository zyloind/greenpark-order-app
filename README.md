# GREENPARK Order App — Koneksi Google Sheets

Bagian backend yang menghubungkan aplikasi order SPV/Kadep Teknik/Administrasi ke
spreadsheet "DASHBOARD HOME WITH AI" yang sudah ada, tanpa mengubah format/kolom sheet.

## Cara kerja singkat

1. Setiap proyek punya tab sendiri di spreadsheet. Nama tab dipetakan di `lib/sheets.js`
   pada objek `PROJECT_TABS` — **cek dulu nama tab aslinya persis sama atau tidak**
   dengan yang ditulis di situ, perbaiki kalau beda ejaan/spasi.
2. Saat SPV submit order (lewat endpoint `/api/orders/submit`):
   - App cari baris header "BLOK" di tab proyek terkait (otomatis, tidak di-hardcode).
   - App cari baris yang kolom Blok-nya cocok dengan unit yang dipilih SPV.
   - Kalau ketemu -> isi baris itu.
   - Kalau tidak ketemu (unit baru) -> tambah baris baru di bawah data terakhir di tab itu.
   - Kolom `List Device` diisi format `Nama Item x<qty>; Nama Item x<qty>; ...` —
     satu-satunya perubahan format dari sheet aslinya.
3. Kolom-kolom lain yang butuh diisi manusia (Purchase Order, Checklist, Bukti
   Dokumentasi, dll) tetap dikosongkan saat submit pertama — diisi bertahap lewat
   endpoint terpisah nanti (untuk Kadep tanda tangan, Admin update progres, dst),
   dengan pola yang sama: cari baris via `findRowForBlok`, lalu `writeOrderToSheet`.

## Setup lokal

```bash
npm install
cp .env.local.example .env.local
# isi 3 nilai di .env.local (lihat komentar di file itu)
npm run dev
```

## Deploy ke Vercel

1. Push folder ini ke repo GitHub.
2. Import project di vercel.com, hubungkan ke repo itu.
3. Di Project Settings > Environment Variables, tambahkan 3 variable yang sama
   seperti di `.env.local.example` (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
   GOOGLE_SHEET_ID).
4. Deploy. URL yang dihasilkan Vercel itulah yang tetap dipakai untuk update
   selanjutnya (lihat pembahasan sebelumnya soal auto-deploy dari Git).

## Yang masih perlu dicek sebelum dipakai production

- [ ] Nama tab di `PROJECT_TABS` sudah dicocokkan persis dengan nama tab asli di sheet.
- [ ] Service account sudah di-share sebagai **Editor** ke spreadsheet.
- [ ] Google Sheets API sudah di-enable di project Google Cloud yang sama dengan
      service account-nya.
- [ ] Coba submit 1 order percobaan dari unit yang SUDAH ada di daftar, dan 1 lagi
      dari unit yang BELUM ada, untuk memastikan dua skenario (isi baris existing vs
      tambah baris baru) berjalan benar sebelum dipakai tim beneran.
