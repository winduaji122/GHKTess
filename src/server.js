const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5173;

const { upload, handleMulterError, uploadDir } = require('./uploadConfig');

// Middleware untuk melayani file statis
app.use(express.static(path.join(__dirname, 'build')));

// Rute untuk menangani semua permintaan lainnya dan mengembalikan file index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Gunakan uploadDir untuk konfigurasi static file serving
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(uploadDir));

app.use('/uploads', expressStaticGzip(uploadDir, {
  // ... (konfigurasi lainnya tetap sama)
}));

// Endpoint untuk mengambil post
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});