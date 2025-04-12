import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { api, refreshCsrfToken } from './api/auth';
import Header from './components/Header';
import Navbar from './components/Navbar';
import FullPostView from './components/FullPostView';
import Dashboard from './components/Dashboard';
import './index.css';
import './transitions.css';
import SearchPage from './components/SearchPage';
import ErrorBoundary from './components/ErrorBoundary';
import AddPostForm from './components/AddPostForm/AddPostForm';
import Home from './components/Home';
import Footer from './components/Footer';
import AdminPosts from './components/AdminPosts';
import Login from './components/Login';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import GoogleAuthCallback from './components/GoogleAuthCallback';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import AdminManagerUsers from './components/AdminManagerUsers.jsx';
import VerifyEmail from './components/VerifyEmail';
import SpotlightPage from './components/SpotlightPage';
import Register from './components/Register';
import WriterPostsPage from './components/WriterPostsPage';
import { getAllPosts } from './api/postApi';
import NotFound from './components/NotFound';
import MyProfile from './components/MyProfile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';
import WriterNotApproved from './components/WriterNotApproved';
import LabelPostsPage from './components/LabelPostsPage';
const API_URL = import.meta.env.VITE_API_BASE_URL;

function PrivateRoute({ children, adminOnly = false, writerOnly = false }) {
  const { user, isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
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
          await refreshAuthState();
          const postsData = await getAllPosts({ page: 1, limit: 20, includeLabels: true });
          setPosts(postsData.posts || []);
        } catch (refreshError) {
          console.error('Error refreshing auth state:', refreshError);
          setError('Sesi Anda telah berakhir. Silakan login kembali.');
          logout();
        }
      } else {
        setError('Gagal mengambil post. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAuthState, logout]);

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
        // Handle error, redirect ke login jika perlu
        navigate('/login');
      }
    };

    checkAuthStatus();
  }, [refreshAuthState, navigate]);

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
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  if (loading) {
    return <div>Loading...</div>;
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
              <Route path="/" element={<Home />} />
              <Route path="/spotlight" element={<SpotlightPage />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/post/:slugOrId" element={<FullPostView />} />
              <Route path="/label/:labelSlug" element={<LabelPostsPage />} />
              <Route path="/posts" element={<LabelPostsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              <Route path="/verify/:token" element={<VerifyEmail />} />
              <Route path="/admin/dashboard" element={<Navigate to="/admin/posts" replace />} />
              <Route path="/admin/approve-writers" element={<PrivateRoute adminOnly><AdminPosts initialTab="pendingWriters" /></PrivateRoute>} />
              <Route path="/admin/manager-users" element={<PrivateRoute adminOnly><AdminManagerUsers /></PrivateRoute>} />
              <Route path="/api/auth/google/callback" element={<GoogleAuthCallback />} />
              <Route
                path="/admin/posts"
                element={
                  <PrivateRoute adminOnly>
                    <AdminPosts
                      posts={posts}
                      onDelete={deletePost}
                      onEdit={handleEdit}
                    />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/add-post"
                element={
                  <PrivateRoute adminOnly>
                    <AddPostForm
                      isEditing={false}
                      onAddPost={addPost}
                      role="admin"
                      onError={(error) => { if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') { navigate('/login'); } }}
                    />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/edit-post/:id"
                element={
                <PrivateRoute adminOnly>
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
                </PrivateRoute>
                }
              />
              <Route
                path="/writer/posts"
                element={
                  <PrivateRoute writerOnly>
                    <WriterPostsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/writer/add-post"
                element={
                  <PrivateRoute writerOnly>
                    <AddPostForm
                      isEditing={false}
                      onAddPost={addPost}
                      role="writer"
                      onError={(error) => { if (error.message === 'Sesi Anda telah berakhir. Silakan login kembali.') { navigate('/login'); } }}
                    />
                  </PrivateRoute>
                }
              />
              <Route
                path="/writer/edit-post/:id"
                element={
                  <PrivateRoute writerOnly>
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
                  </PrivateRoute>
                }
              />
              <Route path="/writer-not-approved" element={<WriterNotApproved />} />
              <Route path="/profile" element={<PrivateRoute><MyProfile /></PrivateRoute>} />

              {/* Rute khusus untuk label, harus ditempatkan setelah semua rute spesifik */}
              <Route path="/:labelSlug" element={<LabelPostsPage />} />

              {/* Rute 404 harus selalu berada di paling bawah */}
              <Route path="*" element={<NotFound />} />
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
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
