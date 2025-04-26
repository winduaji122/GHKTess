# Google Sign-In Integration

## Masalah dengan Google One Tap

Google One Tap Sign-In telah dinonaktifkan karena beberapa masalah:

1. **Origin tidak diizinkan**: Error "The given origin is not allowed for the given client ID" menunjukkan bahwa origin (http://localhost:5173) tidak diizinkan untuk menggunakan Client ID Google yang dikonfigurasi.

2. **FedCM dinonaktifkan di browser**: Error "FedCM was disabled in browser Site Settings" menunjukkan bahwa FedCM dinonaktifkan di pengaturan browser.

3. **Masalah kompatibilitas**: Google One Tap akan mengharuskan penggunaan FedCM mulai Oktober 2024, tetapi implementasi saat ini mengalami masalah kompatibilitas.

## Solusi Sementara

Untuk mengatasi masalah ini, kami telah:

1. **Menonaktifkan Google One Tap**: Fitur Google One Tap telah dinonaktifkan untuk menghindari error dan masalah kompatibilitas.

2. **Tetap menggunakan tombol Google Login manual**: Tombol Google Login manual tetap tersedia dan berfungsi sebagai alternatif.

3. **Menyediakan instruksi untuk mengatasi masalah**: Komponen `GoogleAuthInstructions` menyediakan instruksi langkah demi langkah untuk mengatasi masalah origin tidak diizinkan dan FedCM dinonaktifkan.

## Cara Mengaktifkan Kembali Google One Tap

Jika Anda ingin mengaktifkan kembali Google One Tap, Anda perlu:

1. **Menambahkan origin ke daftar yang diizinkan**:
   - Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Pilih project yang berisi Client ID yang Anda gunakan
   - Klik "Credentials" di sidebar, lalu cari OAuth 2.0 Client ID yang digunakan
   - Tambahkan `http://localhost:5173` dan `http://localhost:5000` ke daftar "Authorized JavaScript origins"
   - Simpan perubahan

2. **Mengaktifkan FedCM di browser Chrome**:
   - Buka `chrome://flags` di browser Chrome
   - Cari "FedCM"
   - Aktifkan flag "FedCM" dan "FedCM Without Third-Party Cookies"
   - Restart browser Chrome

3. **Mengaktifkan kembali kode Google One Tap**:
   - Uncomment kode Google One Tap di `Login.jsx`, `Register.jsx`, `RegisterUser.jsx`, dan `App.jsx`
   - Ubah `use_fedcm_for_prompt: false` menjadi `use_fedcm_for_prompt: true` di `GoogleOneTap.jsx`
   - Ubah `useFedcm={false}` menjadi `useFedcm={true}` di `Login.jsx`

## Catatan Penting

Google akan mengharuskan penggunaan FedCM untuk Google One Tap mulai Oktober 2024. Jika Anda berencana untuk menggunakan Google One Tap di masa depan, pastikan untuk memperbarui kode Anda sesuai dengan [panduan migrasi FedCM](https://developers.google.com/identity/gsi/web/guides/fedcm-migration) dari Google.
