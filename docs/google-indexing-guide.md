# Panduan Pengindeksan Google untuk Gema Hati Kudus

Dokumen ini berisi panduan untuk memastikan website Gema Hati Kudus dapat diindeks dengan baik oleh Google.

## Langkah-langkah Pengindeksan

### 1. Verifikasi Website di Google Search Console

1. Buka [Google Search Console](https://search.google.com/search-console)
2. Klik "Tambahkan Properti" dan pilih "Awalan URL"
3. Masukkan URL website Anda (misalnya: `https://your-domain.com`)
4. Pilih metode verifikasi HTML tag
5. Salin kode verifikasi yang diberikan
6. Buka file `frontend/public/google-site-verification.html` dan ganti `REPLACE_WITH_YOUR_VERIFICATION_CODE` dengan kode verifikasi yang diberikan
7. Buka file `frontend/index.html` dan ganti `REPLACE_WITH_YOUR_VERIFICATION_CODE` dengan kode verifikasi yang sama
8. Deploy website Anda
9. Kembali ke Google Search Console dan klik "Verifikasi"

### 2. Kirim Sitemap ke Google Search Console

1. Pastikan sitemap Anda sudah dibuat dengan benar
2. Jalankan `npm run generate-sitemap` untuk menghasilkan sitemap dinamis
3. Buka Google Search Console
4. Pilih properti website Anda
5. Di menu sidebar, klik "Sitemaps"
6. Masukkan URL sitemap Anda (misalnya: `https://your-domain.com/sitemap.xml`)
7. Klik "Kirim"

### 3. Minta Pengindeksan URL

1. Buka Google Search Console
2. Pilih properti website Anda
3. Di menu sidebar, klik "URL Inspection"
4. Masukkan URL halaman yang ingin diindeks
5. Klik "Request Indexing"

## Praktik Terbaik SEO

### Meta Tags

Pastikan setiap halaman memiliki meta tags yang sesuai:

- `title`: Judul halaman yang deskriptif (50-60 karakter)
- `description`: Deskripsi halaman yang menarik (150-160 karakter)
- `keywords`: Kata kunci yang relevan dengan konten halaman
- `canonical`: URL kanonik halaman

### Structured Data

Pastikan setiap halaman memiliki structured data yang sesuai:

- Halaman beranda: WebSite dan Organization
- Halaman artikel: Article
- Halaman label: CollectionPage

### Konten

- Pastikan konten berkualitas tinggi dan orisinal
- Gunakan heading (h1, h2, h3) dengan struktur yang baik
- Sertakan gambar dengan atribut alt yang deskriptif
- Gunakan internal linking untuk menghubungkan halaman-halaman terkait

### Performa

- Pastikan website memiliki performa yang baik (gunakan Lighthouse untuk mengukur)
- Optimalkan gambar untuk mengurangi ukuran file
- Gunakan lazy loading untuk gambar
- Implementasikan caching yang baik

## Pemantauan

Pantau performa SEO website Anda secara berkala:

1. Buka Google Search Console
2. Periksa laporan "Performance" untuk melihat jumlah klik, impresi, CTR, dan posisi
3. Periksa laporan "Coverage" untuk melihat apakah ada masalah pengindeksan
4. Periksa laporan "Mobile Usability" untuk melihat apakah ada masalah pada perangkat mobile
5. Periksa laporan "Core Web Vitals" untuk melihat performa website

## Troubleshooting

Jika halaman tidak diindeks:

1. Periksa apakah halaman dapat diakses (tidak ada error 404, 500, dll)
2. Periksa apakah halaman tidak diblokir oleh robots.txt
3. Periksa apakah halaman memiliki meta tag `noindex`
4. Periksa apakah halaman memiliki kualitas konten yang baik
5. Periksa apakah halaman memiliki internal linking yang cukup

## Sumber Daya

- [Google Search Console Help](https://support.google.com/webmasters)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Schema.org](https://schema.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
