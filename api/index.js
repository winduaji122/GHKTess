// Vercel serverless entry point
const serverless = require('serverless-http');

// Tangkap error dengan try-catch
try {
  // Import the Express app
  const app = require('../backend/vercel-server');

  // Tambahkan middleware untuk menangkap error
  app.use((err, req, res, next) => {
    console.error('Serverless Error:', err);
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        details: process.env.NODE_ENV === 'production' ? undefined : err.message
      }
    });
  });

  // Export the Express app wrapped with serverless-http
  module.exports = serverless(app, {
    binary: false,
    provider: {
      name: 'vercel'
    }
  });
} catch (error) {
  console.error('Error initializing serverless app:', error);

  // Fallback handler jika terjadi error saat inisialisasi
  module.exports = (req, res) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: {
        message: 'Failed to initialize server',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
      }
    }));
  };
}
