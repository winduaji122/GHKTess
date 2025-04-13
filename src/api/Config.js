// API URL
export const apiUrl = import.meta.env.VITE_API_URL || 'https://ghk-tess-backend.vercel.app';

// Timeout untuk request API (dalam milidetik)
export const apiTimeout = 15000;

// Versi API (jika diperlukan)
export const apiVersion = 'v1';

// Konfigurasi header default
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Konfigurasi untuk upload file
export const uploadHeaders = {
  'Content-Type': 'multipart/form-data',
};

// Batas ukuran upload (dalam bytes, misalnya 5MB)
export const maxUploadSize = 5 * 1024 * 1024;

// Daftar endpoint API
export const endpoints = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  posts: '/api/posts',
  labels: '/api/labels',
  search: '/api/search',
  uploads: '/uploads',
  postById: (id) => `/api/posts/id/${id}`,
  postBySlug: (slug) => `/api/posts/${slug}`,
  relatedPosts: (id) => `/api/posts/${id}/related`,
  featuredPosts: '/api/posts/featured',
  spotlightPosts: '/api/posts/spotlight',
  refreshToken: '/api/auth/refresh-token',
  csrfToken: '/api/auth/csrf-token',
  me: '/api/auth/me',
  popularLabels: '/api/labels/popular',
  // Endpoint baru yang ditambahkan
  myPosts: '/api/posts/my-posts',
  postsByAuthor: (authorId) => `/api/posts/author/${authorId}`,
  incrementViews: (id) => `/api/posts/${id}/increment-views`,
  postVersions: (id) => `/api/posts/${id}/versions`,
  previewPost: '/api/posts/preview',
  postAnalytics: (id) => `/api/posts/${id}/analytics`,
  toggleFeatured: (id) => `/api/posts/${id}/featured`,
  toggleSpotlight: (id) => `/api/posts/${id}/spotlight`,
  createPost: '/api/posts',
  updatePost: (id) => `/api/posts/${id}`,
  deletePost: (id) => `/api/posts/${id}`,
  logout: '/api/auth/logout',
  googleLogin: '/api/auth/google-login',
  pendingWriters: '/api/auth/pending-writers',
  verifyWriter: (id) => `/api/auth/verify-writer/${id}`,
  rejectWriter: (id) => `/api/auth/reject-writer/${id}`,
  postLabels: (postId) => `/api/posts/${postId}/labels`,
};

// Konfigurasi lain yang mungkin diperlukan
export const appName = 'Gema Hati Kudus';
export const supportEmail = 'winduaji999@gmail.com';
