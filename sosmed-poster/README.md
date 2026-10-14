# Auto Post Sosmed

Next.js (App Router, JavaScript) untuk posting ke Facebook, Instagram, Threads, X, lalu catat ke Google Sheets.

## Jalankan

```bash
npm install
cp .env.example .env.local   # isi semua nilainya
npm run dev
```

Deploy: push ke GitHub, import ke Vercel, isi Environment Variables yang sama di Settings.

## Alur

1. Pilih foto, tulis caption -> **Kirim ke Facebook**. Foto diupload satu per satu ke `/api/facebook/photo`,
   lalu `/api/facebook/post` membuat post. Post ID otomatis terisi.
2. **Instagram** dan **Threads** mengambil URL gambar dari post Facebook (itu sebabnya harus FB dulu),
   karena API keduanya butuh `image_url` publik.
3. **Twitter/X**: gambar diupload satu per satu ke `/api/twitter/media`, lalu `/api/twitter/post`
   (maks 4 gambar per tweet, sisanya jadi balasan, terakhir balasan hashtag).
4. **Spreadsheet**: menambah baris di dua sheet. Sesuaikan urutan kolom di `app/api/sheets/route.js`.

## Struktur

```
app/page.js                    form + log + pesan WA
app/api/facebook/photo|post    upload foto, buat post
app/api/instagram              carousel / single image
app/api/threads                carousel / single image / teks
app/api/twitter/media|post     upload gambar, tweet + balasan
app/api/sheets                 append baris ke Google Sheets
lib/graph.js                   helper Graph API + ambil URL gambar dari post FB
lib/auth.js                    cek passcode (header x-passcode)
```

## Yang perlu dicek / disesuaikan

- **Izin Meta**: Page token butuh `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
  `instagram_content_publish`. Threads butuh `threads_basic`, `threads_content_publish`.
  Akun Instagram harus Business/Creator dan terhubung ke Page. Instagram hanya menerima JPEG.
- **Batas ukuran Vercel**: body request serverless maks ~4.5MB, jadi `MAX_MB` di `app/page.js` diset 4.5.
  Kalau foto sering lebih besar, tambahkan kompres di browser (canvas) sebelum upload.
- **Versi Graph API**: ubah `GRAPH_VERSION` di `.env.local` kalau sudah kedaluwarsa.
- **X API**: endpoint upload media pernah berubah. Kalau `/api/twitter/media` error, cek dokumentasi X
  dan changelog `twitter-api-v2`. Panjang tweet 1500 karakter butuh akun yang mendukung tweet panjang.
- **Passcode** hanya pelindung ringan (dicek di server). Untuk pemakaian lebih luas, pakai login sungguhan.
- Token Meta/Threads long-lived tetap kedaluwarsa (sekitar 60 hari untuk Threads), jadwalkan perpanjangan.
