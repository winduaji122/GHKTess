/**
 * Script untuk menghasilkan sitemap.xml dinamis
 *
 * Cara penggunaan:
 * 1. Pastikan .env berisi VITE_API_BASE_URL dan VITE_FRONTEND_URL
 * 2. Jalankan: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ES modules tidak memiliki __dirname, jadi kita perlu membuatnya
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production' });

// Ambil URL dari environment variables
const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

console.log(`Generating sitemap for ${FRONTEND_URL} using API at ${API_URL}`);

// Path untuk sitemap template dan output
const SITEMAP_TEMPLATE = path.join(__dirname, '../public/sitemap.xml');
const SITEMAP_OUTPUT = path.join(process.cwd(), 'dist/sitemap.xml');

// Konfigurasi axios dengan timeout
const axiosInstance = axios.create({
  timeout: 5000, // 5 detik timeout
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Fungsi untuk mendapatkan semua post
async function fetchAllPosts() {
  try {
    console.log('Fetching posts...');
    const response = await axiosInstance.get(`${API_URL}/api/posts/public?limit=1000`);
    console.log(`Successfully fetched ${response.data.posts?.length || 0} posts`);
    return response.data.posts || [];
  } catch (error) {
    console.error('Error fetching posts:', error.message);

    // Jika error 401 atau 404, coba endpoint alternatif
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      try {
        console.log('Trying alternative posts endpoint...');
        const altResponse = await axiosInstance.get(`${API_URL}/api/posts?limit=1000`);
        console.log(`Successfully fetched ${altResponse.data.posts?.length || 0} posts from alternative endpoint`);
        return altResponse.data.posts || [];
      } catch (altError) {
        console.error('Error fetching from alternative posts endpoint:', altError.message);
      }
    }

    return [];
  }
}

// Fungsi untuk mendapatkan semua label
async function fetchAllLabels() {
  try {
    console.log('Fetching labels...');
    const response = await axiosInstance.get(`${API_URL}/api/labels`);
    console.log(`Successfully fetched ${response.data?.length || 0} labels`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching labels:', error.message);

    // Jika error 401 atau 404, coba endpoint alternatif
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      try {
        console.log('Trying alternative labels endpoint...');
        const altResponse = await axiosInstance.get(`${API_URL}/api/labels/public`);
        console.log(`Successfully fetched ${altResponse.data?.length || 0} labels from alternative endpoint`);
        return altResponse.data || [];
      } catch (altError) {
        console.error('Error fetching from alternative labels endpoint:', altError.message);
      }
    }

    return [];
  }
}

// Fungsi untuk mendapatkan semua carousel posts
async function fetchAllCarouselPosts() {
  try {
    console.log('Fetching carousel posts...');
    const response = await axiosInstance.get(`${API_URL}/api/carousel-posts/public`);
    console.log(`Successfully fetched ${response.data.posts?.length || 0} carousel posts`);
    return response.data.posts || [];
  } catch (error) {
    console.error('Error fetching carousel posts:', error.message);

    // Jika error 401 atau 404, coba endpoint alternatif
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      try {
        console.log('Trying alternative carousel posts endpoint...');
        const altResponse = await axiosInstance.get(`${API_URL}/api/carousel`);
        console.log(`Successfully fetched ${altResponse.data.slides?.length || 0} carousel slides from alternative endpoint`);
        return altResponse.data.slides || [];
      } catch (altError) {
        console.error('Error fetching from alternative carousel endpoint:', altError.message);
      }
    }

    return [];
  }
}

// Fungsi untuk mendapatkan semua static pages
async function fetchAllStaticPages() {
  try {
    console.log('Fetching static pages...');
    const response = await axiosInstance.get(`${API_URL}/api/static-pages/public`);
    console.log(`Successfully fetched ${response.data.pages?.length || 0} static pages`);
    return response.data.pages || [];
  } catch (error) {
    console.error('Error fetching static pages:', error.message);

    // Jika error 401 atau 404, coba endpoint alternatif
    if (error.response && (error.response.status === 401 || error.response.status === 404)) {
      try {
        console.log('Trying alternative static pages endpoint...');
        const altResponse = await axiosInstance.get(`${API_URL}/api/pages`);
        console.log(`Successfully fetched ${altResponse.data.pages?.length || 0} static pages from alternative endpoint`);
        return altResponse.data.pages || [];
      } catch (altError) {
        console.error('Error fetching from alternative static pages endpoint:', altError.message);
      }
    }

    return [];
  }
}

// Fungsi untuk menghasilkan sitemap
async function generateSitemap() {
  try {
    console.log('Starting sitemap generation...');

    // Baca template sitemap
    let sitemapContent = fs.readFileSync(SITEMAP_TEMPLATE, 'utf8');

    // Ganti placeholder dengan URL frontend
    sitemapContent = sitemapContent.replace(/%VITE_FRONTEND_URL%/g, FRONTEND_URL);

    // Ambil data dari API dengan timeout
    console.log('Fetching data from API with 10 second timeout...');
    const dataPromise = Promise.all([
      fetchAllPosts(),
      fetchAllLabels(),
      fetchAllCarouselPosts(),
      fetchAllStaticPages()
    ]);

    // Tambahkan timeout untuk seluruh proses fetch
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API fetch timeout after 10 seconds')), 10000);
    });

    // Race antara fetch data dan timeout
    let posts = [], labels = [], carouselPosts = [], staticPages = [];
    try {
      [posts, labels, carouselPosts, staticPages] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]);
    } catch (timeoutError) {
      console.warn('Warning:', timeoutError.message);
      console.log('Using default pages for sitemap...');
    }

    // Tambahkan URL post
    let postUrls = '';
    posts.forEach(post => {
      if (post.status === 'published' && post.slug) {
        postUrls += `
  <url>
    <loc>${FRONTEND_URL}/post/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });

    // Tambahkan URL label
    let labelUrls = '';
    labels.forEach(label => {
      if (label.is_active !== false && label.slug) {
        labelUrls += `
  <url>
    <loc>${FRONTEND_URL}/label/${label.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    });

    // Tambahkan URL carousel posts
    let carouselUrls = '';
    carouselPosts.forEach(post => {
      if ((post.status === 'published' || post.active === true) && post.slug) {
        carouselUrls += `
  <url>
    <loc>${FRONTEND_URL}/carousel-post/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });

    // Tambahkan URL static pages
    let staticPageUrls = '';
    staticPages.forEach(page => {
      if ((page.is_published || page.status === 'published') && page.slug) {
        staticPageUrls += `
  <url>
    <loc>${FRONTEND_URL}/page/${page.slug}</loc>
    <lastmod>${new Date(page.updated_at || page.created_at || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      }
    });

    // Jika tidak ada data dari API, tambahkan halaman default
    if (posts.length === 0 && labels.length === 0 && carouselPosts.length === 0 && staticPages.length === 0) {
      console.log('No data from API, adding default pages...');

      // Tambahkan halaman default
      const defaultPages = `
  <!-- Default pages -->
  <url>
    <loc>${FRONTEND_URL}/spotlight</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/about-us</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/terms-of-service</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

      // Tambahkan halaman default ke sitemap
      postUrls += defaultPages;
    }

    // Tambahkan semua URL ke sitemap
    sitemapContent = sitemapContent.replace('  <!-- Halaman Label akan ditambahkan secara dinamis oleh API -->', labelUrls);
    sitemapContent = sitemapContent.replace('  <!-- Halaman Post akan ditambahkan secara dinamis oleh API -->', postUrls + carouselUrls + staticPageUrls);

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

    console.log(`Sitemap generated successfully with ${posts.length} posts, ${labels.length} labels, ${carouselPosts.length} carousel posts, and ${staticPages.length} static pages`);
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Jika terjadi error, buat sitemap default
    try {
      console.log('Creating default sitemap due to error...');

      // Buat sitemap default
      const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Halaman Utama -->
  <url>
    <loc>${FRONTEND_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Halaman Default -->
  <url>
    <loc>${FRONTEND_URL}/spotlight</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/about-us</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${FRONTEND_URL}/page/terms-of-service</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
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
