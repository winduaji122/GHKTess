/**
 * Script untuk menghasilkan sitemap.xml berdasarkan rute-rute di App.jsx
 *
 * Cara penggunaan:
 * 1. Pastikan .env berisi VITE_FRONTEND_URL
 * 2. Jalankan: node scripts/generate-sitemap-from-routes.js
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';

// ES modules tidak memiliki __dirname, jadi kita perlu membuatnya
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production' });

// Ambil URL dari environment variables
const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

console.log(`Generating sitemap for ${FRONTEND_URL} based on routes`);
console.log(`Using API URL: ${API_URL}`);

// Path untuk output sitemap
const SITEMAP_OUTPUT = path.join(process.cwd(), 'dist/sitemap.xml');

// Konfigurasi axios dengan timeout
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 detik timeout
  headers: {
    'X-Public-Request': 'true', // Tandai sebagai request publik
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Fungsi untuk mengambil data dari endpoint publik
async function fetchPublicData() {
  try {
    console.log('Fetching public data from API...');

    // Buat array untuk menyimpan semua promise
    const promises = [
      // Coba ambil label dari endpoint publik
      axiosInstance.get('/api/search/labels').catch(error => {
        console.warn('Failed to fetch labels from search endpoint:', error.message);
        return { data: [] };
      }),

      // Coba ambil post populer
      axiosInstance.get('/api/posts/popular').catch(error => {
        console.warn('Failed to fetch popular posts:', error.message);
        return { data: { posts: [] } };
      }),

      // Coba ambil carousel posts
      axiosInstance.get('/api/carousel').catch(error => {
        console.warn('Failed to fetch carousel posts:', error.message);
        return { data: { slides: [] } };
      })
    ];

    // Jalankan semua promise dengan timeout
    const results = await Promise.allSettled(promises);

    // Proses hasil
    const labels = results[0].status === 'fulfilled' && results[0].value.data ?
      (Array.isArray(results[0].value.data) ? results[0].value.data : []) : [];

    const popularPosts = results[1].status === 'fulfilled' && results[1].value.data?.posts ?
      results[1].value.data.posts : [];

    const carouselSlides = results[2].status === 'fulfilled' && results[2].value.data?.slides ?
      results[2].value.data.slides : [];

    console.log(`Successfully fetched ${labels.length} labels, ${popularPosts.length} popular posts, and ${carouselSlides.length} carousel slides`);

    return {
      labels,
      popularPosts,
      carouselSlides
    };
  } catch (error) {
    console.error('Error fetching public data:', error.message);
    return {
      labels: [],
      popularPosts: [],
      carouselSlides: []
    };
  }
}

// Daftar rute publik dari App.jsx
// Ini adalah rute-rute yang ingin kita indeks oleh mesin pencari
const publicRoutes = [
  // Halaman utama
  { path: '/', changefreq: 'daily', priority: '1.0' },

  // Halaman konten utama
  { path: '/spotlight', changefreq: 'daily', priority: '0.8' },
  { path: '/search', changefreq: 'weekly', priority: '0.6' },
  { path: '/posts', changefreq: 'daily', priority: '0.7' },

  // Halaman statis
  { path: '/page/about-us', changefreq: 'monthly', priority: '0.5' },
  { path: '/page/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/page/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { path: '/page/terms-of-service', changefreq: 'monthly', priority: '0.3' },

  // Legacy routes
  { path: '/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms-of-service', changefreq: 'monthly', priority: '0.3' },

  // Label populer (berdasarkan kategori yang mungkin ada)
  { path: '/rohani', changefreq: 'daily', priority: '0.7' },
  { path: '/berita', changefreq: 'daily', priority: '0.7' },
  { path: '/renungan', changefreq: 'daily', priority: '0.7' },
  { path: '/inspirasi', changefreq: 'daily', priority: '0.7' },
  { path: '/doa', changefreq: 'daily', priority: '0.7' },
  { path: '/kitab-suci', changefreq: 'daily', priority: '0.7' },
  { path: '/gereja', changefreq: 'daily', priority: '0.7' },
  { path: '/keluarga', changefreq: 'daily', priority: '0.7' },
];

// Rute dinamis yang perlu data dari API
const dynamicRoutePatterns = [
  { pattern: '/post/:slugOrId', changefreq: 'weekly', priority: '0.7' },
  { pattern: '/carousel-post/:slug', changefreq: 'weekly', priority: '0.7' },
  { pattern: '/label/:labelSlug', changefreq: 'daily', priority: '0.6' },
  { pattern: '/page/:slug', changefreq: 'monthly', priority: '0.5' },
  { pattern: '/:labelSlug', changefreq: 'daily', priority: '0.6' }, // Rute label alternatif
];

// Rute yang tidak boleh diindeks
const excludedRoutes = [
  '/login',
  '/register',
  '/register-user',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify',
  '/dashboard',
  '/profile',
  '/admin',
  '/writer',
  '/writer-not-approved',
  '/oauth2callback',
  '/google-login-success',
];

// Fungsi untuk menghasilkan sitemap
async function generateSitemap() {
  try {
    console.log('Starting sitemap generation from routes...');

    // Ambil data dari API
    const publicData = await fetchPublicData();

    // Buat header sitemap
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Tambahkan rute statis
    console.log('Adding static routes...');
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    publicRoutes.forEach(route => {
      sitemapContent += `  <url>
    <loc>${FRONTEND_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
    });

    // Tambahkan label dari API
    if (publicData.labels && publicData.labels.length > 0) {
      console.log(`Adding ${publicData.labels.length} labels from API...`);
      publicData.labels.forEach(label => {
        if (label.slug) {
          sitemapContent += `  <url>
    <loc>${FRONTEND_URL}/label/${label.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }
      });
    }

    // Tambahkan post populer dari API
    if (publicData.popularPosts && publicData.popularPosts.length > 0) {
      console.log(`Adding ${publicData.popularPosts.length} popular posts from API...`);
      publicData.popularPosts.forEach(post => {
        if (post.slug && post.status === 'published') {
          const lastmod = post.updated_at || post.created_at || today;
          const formattedDate = new Date(lastmod).toISOString().split('T')[0];

          sitemapContent += `  <url>
    <loc>${FRONTEND_URL}/post/${post.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      });
    }

    // Tambahkan carousel slides dari API
    if (publicData.carouselSlides && publicData.carouselSlides.length > 0) {
      console.log(`Adding ${publicData.carouselSlides.length} carousel slides from API...`);
      publicData.carouselSlides.forEach(slide => {
        if (slide.slug) {
          const lastmod = slide.updated_at || slide.created_at || today;
          const formattedDate = new Date(lastmod).toISOString().split('T')[0];

          sitemapContent += `  <url>
    <loc>${FRONTEND_URL}/carousel-post/${slide.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      });
    }

    // Tambahkan catatan tentang rute dinamis
    sitemapContent += `  <!-- Dynamic routes that would be populated with actual data -->
  <!--
${dynamicRoutePatterns.map(pattern => `  ${pattern.pattern} - changefreq: ${pattern.changefreq}, priority: ${pattern.priority}`).join('\n')}
  -->
`;

    // Tambahkan catatan tentang rute yang dikecualikan
    sitemapContent += `  <!-- Excluded routes -->
  <!--
${excludedRoutes.map(route => `  ${route}`).join('\n')}
  -->
`;

    // Tutup sitemap
    sitemapContent += `</urlset>`;

    // Pastikan direktori dist ada
    const distDir = path.dirname(SITEMAP_OUTPUT);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Tulis sitemap ke file
    fs.writeFileSync(SITEMAP_OUTPUT, sitemapContent);
    console.log(`Sitemap written to ${SITEMAP_OUTPUT}`);

    // Salin juga ke direktori public untuk pengembangan lokal
    try {
      fs.writeFileSync(path.join(process.cwd(), 'public/sitemap-generated.xml'), sitemapContent);
      console.log('Sitemap also copied to public/sitemap-generated.xml');
    } catch (copyError) {
      console.warn('Warning: Could not copy sitemap to public directory:', copyError.message);
    }

    // Hitung total URL yang ditambahkan
    const totalStaticRoutes = publicRoutes.length;
    const totalLabels = publicData.labels?.length || 0;
    const totalPosts = publicData.popularPosts?.length || 0;
    const totalSlides = publicData.carouselSlides?.length || 0;
    const totalUrls = totalStaticRoutes + totalLabels + totalPosts + totalSlides;

    console.log(`Sitemap generated successfully with ${totalUrls} URLs:`);
    console.log(`- ${totalStaticRoutes} static routes`);
    console.log(`- ${totalLabels} labels from API`);
    console.log(`- ${totalPosts} posts from API`);
    console.log(`- ${totalSlides} carousel slides from API`);
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Jika terjadi error, buat sitemap default
    try {
      console.log('Creating default sitemap due to error...');

      // Buat sitemap default
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${FRONTEND_URL}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/spotlight</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/posts</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/about-us</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

      // Pastikan direktori dist ada
      const distDir = path.dirname(SITEMAP_OUTPUT);
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // Tulis sitemap default ke file
      fs.writeFileSync(SITEMAP_OUTPUT, defaultSitemap);
      console.log('Default sitemap created successfully');
    } catch (fallbackError) {
      console.error('Critical error: Failed to create default sitemap:', fallbackError);
    }
  }
}

// Jalankan fungsi utama
generateSitemap();
