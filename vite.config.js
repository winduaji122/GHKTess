import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import fs from 'fs'
import path from 'path'
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

// Plugin untuk mengganti variabel lingkungan di robots.txt dan sitemap.xml
function robotsAndSitemapPlugin() {
  return {
    name: 'robots-sitemap-plugin',
    writeBundle() {
      const env = loadEnv(process.env.NODE_ENV, process.cwd(), '');
      const frontendUrl = env.VITE_FRONTEND_URL || 'http://localhost:5173';

      // Proses robots.txt
      try {
        const robotsPath = path.resolve('public', 'robots.txt');
        const robotsDistPath = path.resolve('dist', 'robots.txt');

        if (fs.existsSync(robotsPath)) {
          let robotsContent = fs.readFileSync(robotsPath, 'utf8');
          robotsContent = robotsContent.replace(/\${VITE_FRONTEND_URL}/g, frontendUrl);
          fs.writeFileSync(robotsDistPath, robotsContent);
          console.log('✅ robots.txt processed successfully');
        } else {
          console.warn('⚠️ robots.txt not found in public directory');

          // Buat robots.txt default jika tidak ada
          const defaultRobotsContent = `# robots.txt for Gema Hati Kudus
User-agent: *
Allow: /

# Disallow admin and private routes
Disallow: /admin/
Disallow: /writer/
Disallow: /dashboard
Disallow: /profile
Disallow: /login
Disallow: /register

# Sitemap location
Sitemap: ${frontendUrl}/sitemap.xml`;

          fs.writeFileSync(robotsDistPath, defaultRobotsContent);
          console.log('✅ Default robots.txt created');
        }
      } catch (error) {
        console.error('❌ Error processing robots.txt:', error);
      }

      // Salin file verifikasi Google Search Console
      try {
        const verificationFiles = [
          'googlede9e9fdfc5c6af66.html',
          'google-site-verification.html'
        ];

        verificationFiles.forEach(file => {
          const sourcePath = path.resolve('public', file);
          const destPath = path.resolve('dist', file);

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`✅ ${file} copied to dist`);
          }
        });
      } catch (error) {
        console.error('❌ Error copying verification files:', error);
      }

      // Proses sitemap.xml jika belum diproses oleh script generate-sitemap
      try {
        const sitemapPath = path.resolve('public', 'sitemap.xml');
        const sitemapDistPath = path.resolve('dist', 'sitemap.xml');
        const sitemapGeneratedPath = path.resolve('public', 'sitemap-generated.xml');

        // Cek apakah ada sitemap yang dihasilkan oleh script generate-sitemap
        if (fs.existsSync(sitemapGeneratedPath)) {
          // Gunakan sitemap yang dihasilkan oleh script
          let sitemapContent = fs.readFileSync(sitemapGeneratedPath, 'utf8');
          fs.writeFileSync(sitemapDistPath, sitemapContent);
          console.log('✅ Generated sitemap.xml copied to dist');
        } else if (fs.existsSync(sitemapPath) && !fs.existsSync(sitemapDistPath)) {
          // Gunakan sitemap template
          let sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
          sitemapContent = sitemapContent.replace(/%VITE_FRONTEND_URL%/g, frontendUrl);
          fs.writeFileSync(sitemapDistPath, sitemapContent);
          console.log('✅ Template sitemap.xml processed successfully');
        } else if (!fs.existsSync(sitemapDistPath)) {
          // Buat sitemap default jika tidak ada
          const defaultSitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${frontendUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${frontendUrl}/spotlight</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

          fs.writeFileSync(sitemapDistPath, defaultSitemapContent);
          console.log('✅ Default sitemap.xml created');
        }
      } catch (error) {
        console.error('❌ Error processing sitemap.xml:', error);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlEnvPlugin(),
    robotsAndSitemapPlugin(),
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
