import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
// Komentar: Plugin compression akan ditambahkan setelah instalasi
// import viteCompression from 'vite-plugin-compression'

// Plugin untuk mengganti variabel lingkungan di HTML
function htmlEnvPlugin() {
  return {
    name: 'html-env-plugin',
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        const env = loadEnv(process.env.NODE_ENV, process.cwd(), '');

        // Ganti semua %ENV_VAR% dengan nilai dari .env
        return html.replace(/%([^%]+)%/g, (_, p1) => {
          return env[p1] || '';
        });
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlEnvPlugin(),
    // Komentar: Plugin compression akan ditambahkan setelah instalasi
    // viteCompression({
    //   algorithm: 'gzip',
    //   ext: '.gz',
    //   threshold: 10240, // Hanya kompres file yang lebih besar dari 10kb
    //   deleteOriginFile: false
    // })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    cors: {
      origin: 'http://localhost:5000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true
    }
  },
  // Hapus define karena Vite sudah menangani env variables dengan baik
  // define: {
  //   'process.env': {
  //     VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:5000'),
  //     NODE_ENV: JSON.stringify(process.env.NODE_ENV)
  //   }
  // },
  build: {
    sourcemap: false, // Matikan sourcemap untuk produksi
    minify: 'esbuild', // Gunakan esbuild untuk minifikasi yang lebih cepat
    target: 'es2015', // Target ES2015 untuk kompatibilitas browser yang lebih luas
    chunkSizeWarningLimit: 800, // Meningkatkan batas peringatan ukuran chunk
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    cssCodeSplit: true, // Pisahkan CSS ke dalam file terpisah
    reportCompressedSize: false, // Matikan pelaporan ukuran terkompresi untuk build yang lebih cepat
    rollupOptions: {
      output: {
        // Mengoptimalkan nama file untuk caching yang lebih baik
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: (id) => {
          // React dan ekosistemnya
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/@react')) {
            return 'react-vendor';
          }

          // Router dan navigasi
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/history')) {
            return 'router';
          }

          // UI libraries
          if (id.includes('node_modules/bootstrap') ||
              id.includes('node_modules/react-bootstrap') ||
              id.includes('node_modules/@mui') ||
              id.includes('node_modules/@emotion')) {
            return 'ui-libs';
          }

          // Utilitas dan HTTP
          if (id.includes('node_modules/axios') ||
              id.includes('node_modules/lodash') ||
              id.includes('node_modules/moment')) {
            return 'utils';
          }

          // Icons dan visual
          if (id.includes('node_modules/react-icons') ||
              id.includes('node_modules/@heroicons') ||
              id.includes('node_modules/recharts')) {
            return 'icons-charts';
          }

          // Form dan editor
          if (id.includes('node_modules/react-quill') ||
              id.includes('node_modules/react-beautiful-dnd')) {
            return 'editors';
          }

          // Notifikasi dan UI feedback
          if (id.includes('node_modules/react-toastify') ||
              id.includes('node_modules/react-hot-toast')) {
            return 'notifications';
          }

          // Jika tidak cocok dengan kategori di atas, biarkan Vite menanganinya
        }
      }
    }
  },
  // Tambahkan konfigurasi untuk Vercel
  vercel: {
    enabled: true
  }
})
