# Cara Mengubah Tinggi Navbar

Navbar di aplikasi ini menggunakan CSS variable untuk mengatur tingginya. Ini memungkinkan Anda untuk dengan mudah mengubah tinggi navbar tanpa harus mengubah banyak file CSS.

## Mengubah Tinggi Navbar Secara Global

Untuk mengubah tinggi navbar secara global, Anda dapat mengedit file `index.css` dan mengubah nilai dari variabel `--navbar-height` di selector `:root`:

```css
:root {
  /* ... properti lainnya ... */
  --navbar-height: 40px; /* Ubah nilai ini sesuai kebutuhan */
}
```

## Mengubah Tinggi Navbar di Komponen Tertentu

Jika Anda ingin mengubah tinggi navbar hanya di komponen atau halaman tertentu, Anda dapat menambahkan CSS berikut ke komponen tersebut:

```jsx
// Di komponen React
<div style={{ "--navbar-height": "50px" }}>
  {/* Konten komponen */}
</div>
```

Atau di file CSS:

```css
.custom-page {
  --navbar-height: 50px;
}
```

## Struktur CSS Navbar

Navbar menggunakan struktur berikut:

1. `.navbar-container` - Container utama untuk navbar, menggunakan `--navbar-height` untuk tingginya
2. `.navbar` - Styling untuk navbar itu sendiri
3. `.navbar-content` - Styling untuk konten di dalam navbar

Semua elemen ini bekerja bersama untuk membuat navbar yang responsif dan mudah dikustomisasi.
