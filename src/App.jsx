import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { api, refreshCsrfToken } from './api/auth';
import { getAllPosts } from './api/postApi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';
import './index.css';
import './transitions.css';

// Google One Tap dinonaktifkan karena masalah kompatibilitas

// Komponen yang selalu digunakan/kritis
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load komponen yang lebih besar atau jarang digunakan
const Home = React.lazy(() => import('./components/Home'));
const FullPostView = React.lazy(() => import('./components/FullPostView'));
// Import Dashboard secara langsung untuk menghindari masalah lazy loading
import Dashboard from './components/Dashboard';
const SearchPage = React.lazy(() => import('./components/SearchPage'));
const AddPostForm = React.lazy(() => import('./components/AddPostForm/AddPostForm'));
const AdminPosts = React.lazy(() => import('./components/AdminPosts'));
const Login = React.lazy(() => import('./components/Login'));
const StaticPage = React.lazy(() => import('./components/StaticPage'));
// Legacy pages - akan digantikan oleh StaticPage
const PrivacyPolicy = React.lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./components/TermsOfService'));
const GoogleAuthCallback = React.lazy(() => import('./components/GoogleAuthCallback'));
const GoogleLoginSuccess = React.lazy(() => import('./components/GoogleLoginSuccess'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const AdminManagerUsers = React.lazy(() => import('./components/AdminManagerUsers.jsx'));
const VerifyEmail = React.lazy(() => import('./components/VerifyEmail'));
const SpotlightPage = React.lazy(() => import('./components/SpotlightPage'));
const Register = React.lazy(() => import('./components/Register'));
const RegisterUser = React.lazy(() => import('./components/RegisterUser'));
const WriterPostsPage = React.lazy(() => import('./components/WriterPostsPage'));
const NotFound = React.lazy(() => import('./components/NotFound'));
const MyProfile = React.lazy(() => import('./components/MyProfile'));
const WriterNotApproved = React.lazy(() => import('./components/WriterNotApproved'));
const LabelPostsPage = React.lazy(() => import('./components/LabelPostsPage'));
const CarouselPostView = React.lazy(() => import('./components/Carousel/CarouselPostView'));
const AddCarouselPost = React.lazy(() => import('./components/Carousel/AddCarouselPost'));
const API_URL = import.meta.env.VITE_API_BASE_URL;

function PrivateRoute({ children, adminOnly = false, writerOnly = false }) {
  const { user, isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (writerOnly && user?.role !== 'writer') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoggedIn, login, logout, refreshAuthState, updateAccessToken } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const postsData = await getAllPosts({ page: 1, limit: 20, includeLabels: true });
      setPosts(postsData.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (error.response && error.response.status === 401) {
        try {
          // Coba refresh token tanpa logout jika gagal
          if (refreshAuthState) {
            await refreshAuthState();
            try {
              const postsData = await getAllPosts({ page: 1, limit: 20, includeLabels: true });
              setPosts(postsData.posts || []);
            } catch (retryError) {
              console.error('Error fetching posts after token refresh:', retryError);
              // Tetap tampilkan halaman meskipun gagal mengambil posts
              setPosts([]);
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing auth state:', refreshError);
          // Tetap tampilkan halaman meskipun gagal refresh token
          setPosts([]);
        }
      } else {
        // Tetap tampilkan halaman meskipun gagal mengambil posts
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAuthState]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (refreshAuthState) {
          await refreshAuthState();
        }
      } catch (error) {
        console.error('Failed to refresh auth state:', error);
        // Hanya log error, jangan redirect ke login
        // Ini mencegah redirect otomatis ke login saat membuka halaman utama
      }
    };

    checkAuthStatus();
  }, [refreshAuthState]);

  const filteredPosts = useMemo(() => {
    return Array.isArray(posts) ? posts.filter(post =>
      post &&
      typeof post === 'object' &&
      ((post.title && post.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.content && post.content.toLowerCase().includes(searchTerm.toLowerCase())))
    ) : [];
  }, [posts, searchTerm]);

  const addPost = useCallback(async (postData) => {
    try {
      const response = await api.post('/api/posts', postData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPosts(prevPosts => [...prevPosts, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error menambahkan post:', error);
      if (error.response && error.response.status === 401) {
        logout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
      throw error;
    }
  }, [logout]);

  const deletePost = useCallback(async (id) => {
    try {
      await api.delete(`/api/posts/${id}`);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }, []);

  const handleEdit = useCallback((post) => {
    setEditingPost(post);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPost(null);
  }, []);

  const handleUpdatePost = useCallback(async (updatedPost) => {
    try {
      const formData = new FormData();
      for (const key in updatedPost) {
        if (key === 'image' && updatedPost[key] instanceof File) {
          formData.append(key, updatedPost[key]);
        } else if (key === 'labels') {
          formData.append(key, JSON.stringify(updatedPost[key]));
        } else {
          formData.append(key, updatedPost[key]);
        }
      }

      const response = await api.put(`/api/posts/${updatedPost.id}`, formData);
      setPosts(prevPosts => prevPosts.map(p => p.id === response.data.id ? response.data : p));
      setEditingPost(null);
      return response.data; // Pastikan ini dikembalikan
    } catch (error) {
      console.error('Error updating post:', error);
      if (error.response && error.response.status === 401) {
        logout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
      throw error;
    }
  }, [logout, API_URL]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    try {
      const userData = await login(email, password);
      if (userData.user.role === 'admin') {
        navigate('/admin/posts');
      } else if (userData.user.role === 'writer' && userData.user.is_approved) {
        navigate('/writer/posts');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [login, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('Handling logout in App.jsx');
      // Hapus semua data dari localStorage terlebih dahulu
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      localStorage.removeItem('token');

      // Tambahkan flag untuk menandai bahwa user baru saja logout
      sessionStorage.setItem('recently_logged_out', 'true');

      // Reset state di App.jsx
      setPosts([]);
      setEditingPost(null);
      setSearchTerm('');

      // Panggil fungsi logout dan tunggu sampai selesai
      const result = await logout();
      console.log('Logout API call completed with result:', result);

      // Dispatch event untuk memberitahu komponen lain
      window.dispatchEvent(new Event('app:logout'));

      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      // Tetap hapus data meskipun API call gagal
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      localStorage.removeItem('token');

      // Tambahkan flag untuk menandai bahwa user baru saja logout
      sessionStorage.setItem('recently_logged_out', 'true');
      return false;
    }
  }, [logout, setPosts]);

  if (loading) {
    return null;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ borderTop: 'none', borderBottom: 'none' }}>
      <div className="header-container" style={{ borderBottom: 'none' }}>
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} user={user} />
      </div>
      <div className="navbar-container" style={{ borderTop: 'none' }}>
        <Navbar onSearch={handleSearch} isAdmin={user?.role === 'admin'} onLogout={handleLogout} />
      </div>
      <div className="flex-grow mb-4">
        <div id="general-container" className="general-container">
          <main className="flex-grow pb-8">
            <Routes>
              <Route path="/" element={<Suspense fallback={null}><Home /></Suspense>} />
              <Route path="/spotlight" element={<Suspense fallback={null}><SpotlightPage /></Suspense>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/post/:slugOrId" element={<Suspense fallback={null}><FullPostView /></Suspense>} />
              <Route path="/carousel-post/:slug" element={<Suspense fallback={null}><CarouselPostView /></Suspense>} />
              <Route path="/admin/add-carousel-post" element={<PrivateRoute adminOnly><Suspense fallback={null}><AddCarouselPost /></Suspense></PrivateRoute>} />
              <Route path="/admin/edit-carousel-post/:id" element={<PrivateRoute adminOnly><Suspense fallback={null}><AddCarouselPost /></Suspense></PrivateRoute>} />
              <Route path="/label/:labelSlug" element={<Suspense fallback={null}><LabelPostsPage /></Suspense>} />
              <Route path="/posts" element={<Suspense fallback={null}><LabelPostsPage /></Suspense>} />
              <Route path="/search" element={<Suspense fallback={null}><SearchPage /></Suspense>} />
              <Route path="/login" element={<Suspense fallback={null}><Login onLogin={handleLogin} /></Suspense>} />
              {/* Legacy routes - akan digantikan oleh /page/:slug */}
              <Route path="/privacy-policy" element={<Suspense fallback={null}><PrivacyPolicy /></Suspense>} />
              <Route path="/terms-of-service" element={<Suspense fallback={null}><TermsOfService /></Suspense>} />

              {/* Static Page route */}
              <Route path="/page/:slug" element={<Suspense fallback={null}><StaticPage /></Suspense>} />
              <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPassword /></Suspense>} />
              <Route path="/reset-password/:token" element={<Suspense fallback={null}><ResetPassword /></Suspense>} />
              <Route path="/register" element={<Suspense fallback={null}><Register /></Suspense>} />
              <Route path="/register-user" element={<Suspense fallback={null}><RegisterUser /></Suspense>} />
              <Route path="/verify-email/:token" element={<Suspense fallback={null}><VerifyEmail /></Suspense>} />
              <Route path="/verify/:token" element={<Suspense fallback={null}><VerifyEmail /></Suspense>} />
              <Route path="/admin/dashboard" element={<Navigate to="/admin/posts" replace />} />
              <Route path="/admin/approve-writers" element={<PrivateRoute adminOnly><Suspense fallback={null}><AdminPosts initialTab="pendingWriters" /></Suspense></PrivateRoute>} />
              <Route path="/admin/manager-users" element={<PrivateRoute adminOnly><Suspense fallback={null}><AdminManagerUsers /></Suspense></PrivateRoute>} />
              <Route path="/oauth2callback" element={<Suspense fallback={null}><GoogleAuthCallback /></Suspense>} />
              <Route path="/google-login-success" element={<Suspense fallback={null}><GoogleLoginSuccess /></Suspense>} />
              <Route
                path="/admin/posts"
                element={
                  <PrivateRoute adminOnly>
                    <Suspense fallback={null}>
                      <AdminPosts
                        posts={posts}
                        onDelete={deletePost}
                        onEdit={handleEdit}
                      />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/add-post"
                element={
                  <PrivateRoute adminOnly>
                    <Suspense fallback={null}>
                      <AddPostForm
                        isEditing={false}
                        onAddPost={addPost}
                        role="admin"
                        onError={(error) => { if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') { navigate('/login'); } }}
                      />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/edit-post/:id"
                element={
                <PrivateRoute adminOnly>
                  <Suspense fallback={null}>
                    <AddPostForm
                      isEditing={true}
                      onUpdatePost={handleUpdatePost}
                      editingPost={editingPost}
                      onCancelEdit={handleCancelEdit}
                      onError={(error) => {
                        if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') {
                          navigate('/login');
                        }
                      }}
                    />
                  </Suspense>
                </PrivateRoute>
                }
              />
              <Route
                path="/writer/posts"
                element={
                  <PrivateRoute writerOnly>
                    <Suspense fallback={null}>
                      <WriterPostsPage />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/writer/add-post"
                element={
                  <PrivateRoute writerOnly>
                    <Suspense fallback={null}>
                      <AddPostForm
                        isEditing={false}
                        onAddPost={addPost}
                        role="writer"
                        onError={(error) => { if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') { navigate('/login'); } }}
                      />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/writer/edit-post/:id"
                element={
                  <PrivateRoute writerOnly>
                    <Suspense fallback={null}>
                      <AddPostForm
                        isEditing={true}
                        onUpdatePost={handleUpdatePost}
                        editingPost={editingPost}
                        onCancelEdit={handleCancelEdit}
                        onError={(error) => {
                          if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') {
                            navigate('/login');
                          }
                        }}
                      />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route path="/writer-not-approved" element={<Suspense fallback={null}><WriterNotApproved /></Suspense>} />
              <Route path="/profile" element={<PrivateRoute><Suspense fallback={null}><MyProfile /></Suspense></PrivateRoute>} />

              {/* Rute khusus untuk label, harus ditempatkan setelah semua rute spesifik */}
              <Route path="/:labelSlug" element={<Suspense fallback={null}><LabelPostsPage /></Suspense>} />

              {/* Rute 404 harus selalu berada di paling bawah */}
              <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
            </Routes>
          </main>
        </div>
      </div>
      <Footer className="mt-8" style={{backgroundColor: '#000000'}} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  // Log Client ID dan origin untuk debugging
  console.log('Using Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log('Current origin:', window.location.origin);
  console.log('Current URL:', window.location.href);

  // Tambahkan variabel untuk Client ID agar lebih mudah di-debug
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  console.log('App component - Using Google Client ID:', googleClientId);

  return (
    <GoogleOAuthProvider clientId={googleClientId} onScriptLoadError={(error) => {
      console.error('Google OAuth script load error:', error);
    }}>
      <Router>
        <HelmetProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
        </HelmetProvider>
      </Router>
      <SpeedInsights />
    </GoogleOAuthProvider>
  );
}

export default App;
