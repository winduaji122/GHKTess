import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import PostItem from './PostItem';

import { useAuth } from '../contexts/AuthContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import LazyImage from './common/LazyImage';
import '../styles/lazyImage.css';
import {
  getAllPostsAdmin,
  toggleFeaturedPost,
  advancedSearch,
  getDeletedPosts,
  getAdminFeaturedPost,
  softDeletePost,
  restorePost,
  permanentDeletePost
} from '../api/postApi';
// import userService from '../services/userService'; // Tidak digunakan
// import moment from 'moment'; // Tidak digunakan
// import { debounce } from 'lodash'; // Tidak digunakan
import './AdminPosts.css';
import { api } from '../api/axios';
import { refreshCsrfToken } from '../api/auth';
// import { getLabels, searchLabels } from '../api/labelApi'; // Tidak digunakan
import SearchBar from './SearchBar';
import { refreshToken } from '../utils/tokenManager';
import AdminManagerUsers from './AdminManagerUsers';
import CarouselManager from './Admin/CarouselManager';
import FooterManager from './Admin/FooterManager';
// import { LazyLoadImage } from 'react-lazy-load-image-component'; // Tidak digunakan
import 'react-lazy-load-image-component/src/effects/blur.css';
import Pagination from './Pagination';
// import { getImageUrl } from '../utils/imageHelper'; // Tidak digunakan karena kita mengimplementasikan getPostImageUrl
// import { getCurrentUser } from '../api/auth'; // Tidak digunakan
import { toast } from 'react-hot-toast';
import { FiFilter } from 'react-icons/fi';
// import PostStats from './PostStats'; // Tidak digunakan

// Tambahkan fungsi helper untuk memastikan label selalu array
const ensureLabels = (post) => {
  if (!post) return null;
  return {
    ...post,
    labels: Array.isArray(post.labels) ? post.labels : []
  };
};

// Tambahkan fungsi helper untuk memastikan status post valid
const ensurePostStatus = (post) => {
  if (!post) return null;
  return {
    ...post,
    status: post.status || 'draft' // default ke 'draft' jika status null/undefined
  };
};

function AdminPosts() {

  const [featuredPost, setFeaturedPost] = useState(null);
  const [regularPosts, setRegularPosts] = useState([]);
  // const [loading, setLoading] = useState(true); // Tidak digunakan
  const [error, setError] = useState(null);
  // const [searchTerm, setSearchTerm] = useState(''); // Tidak digunakan
  // const [allRegularPosts, setAllRegularPosts] = useState([]); // Tidak digunakan
  // const [statusFilter, setStatusFilter] = useState('all'); // Tidak digunakan
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('posts');
  // const [selectedLabel, setSelectedLabel] = useState(''); // Tidak digunakan
  const [labels, setLabels] = useState([]);
  // const [featuredFilter, setFeaturedFilter] = useState('all'); // Tidak digunakan
  const [filters, setFilters] = useState({
    status: 'all',
    label: '',
    featured: 'all',
    role: 'all'
  });
  const [sortBy, setSortBy] = useState('created_at:desc');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const { user, /* refreshAuthState, */ logout } = useAuth();
  const navigate = useNavigate();

  const searchTimeoutRef = useRef(null);
  // const filterTimeoutRef = useRef(null); // Tidak digunakan
  // const authCheckRef = useRef(false); // Tidak digunakan

  const [initialLoading, setInitialLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  // Tambahkan state untuk transisi
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Tambahkan state untuk loading dropdown
  // const [dropdownLoading, setDropdownLoading] = useState(false); // Tidak digunakan

  // Tambahkan state untuk mengontrol visibility
  const [showFeatured, setShowFeatured] = useState(true);

  // Tambahkan state untuk deleted posts
  const [deletedPosts, setDeletedPosts] = useState([]);

  const location = useLocation();
  const { state } = location;

  // const [posts, setPosts] = useState([]); // Tidak digunakan

  // const [imageVersion, setImageVersion] = useState(Date.now()); // Tidak digunakan

  const [imageLoadErrors, setImageLoadErrors] = useState({});

  // Tambahkan state untuk tracking gambar yang diupdate
  const [updatedImages, setUpdatedImages] = useState(new Set());
  const [imageVersions, setImageVersions] = useState({});

  // Tambahkan state untuk tracking post yang diupdate
  const [lastUpdatedPost, setLastUpdatedPost] = useState(null);

  const [featuredLoading, setFeaturedLoading] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'column', 'flexbox'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Tambahkan meta tags untuk SEO
  useEffect(() => {
    // Set document title
    document.title = `Admin Posts - Kelola Semua Postingan | GHK`;

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Halaman admin untuk mengelola semua postingan, termasuk featured post, regular posts, dan post terhapus.');
    } else {
      const newMetaDescription = document.createElement('meta');
      newMetaDescription.name = 'description';
      newMetaDescription.content = 'Halaman admin untuk mengelola semua postingan, termasuk featured post, regular posts, dan post terhapus.';
      document.head.appendChild(newMetaDescription);
    }
  }, []);

  // Load view mode dari localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('adminPostsViewMode');
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Handle activeTab dari location.state
  useEffect(() => {
    if (state && state.activeTab) {
      setActiveTab(state.activeTab);
    }
  }, [state]);

  useEffect(() => {
    const lastUpdatedPost = sessionStorage.getItem('lastUpdatedPost');
    if (lastUpdatedPost) {
      try {
        const updatedData = JSON.parse(lastUpdatedPost);

        // Update post status dan image di regularPosts
        setRegularPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === updatedData.id
              ? { ...post, ...updatedData } // Update semua data yang baru
              : post
          )
        );

        // Update featured post jika yang diedit adalah featured post
        if (featuredPost?.id === updatedData.id) {

          setFeaturedPost(prev => ({ ...prev, ...updatedData }));
        }

        // Update image version
        setImageVersions(prev => ({
          ...prev,
          [updatedData.id]: Date.now()
        }));

        // Set lastUpdatedPost untuk highlight
        setLastUpdatedPost(updatedData.id);

        // Bersihkan sessionStorage
        sessionStorage.removeItem('lastUpdatedPost');
        console.log('Cleared lastUpdatedPost from sessionStorage');
      } catch (error) {
        console.error('Error parsing lastUpdatedPost data:', error);
      }
    }
  }, [location, featuredPost?.id]); // Tambahkan featuredPost?.id ke dependency array

  // Tambahkan fungsi helper untuk memastikan status post valid
  const getStatusClass = (status) => {
    if (!status) return 'admin-post-status draft';

    const normalizedStatus = status.toLowerCase().trim();

    switch (normalizedStatus) {
      case 'published':
        return 'admin-post-status published';
      case 'draft':
        return 'admin-post-status draft';
      case 'scheduled':
        return 'admin-post-status scheduled';
      case 'archived':
        return 'admin-post-status archived';
      default:
        return 'admin-post-status draft';
    }
  };

  // Definisikan fetchLabels terlebih dahulu
  const fetchLabels = useCallback(async () => {
    try {
      const response = await api.get('/api/labels');
      if (response.data) {
        setLabels(response.data);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, []);




  // Tambahkan flag untuk mencegah multiple fetching
  const isFetchingRef = useRef(false);

  const fetchRegularPosts = useCallback(async () => {
    // Jika tidak ada user, jangan lakukan fetch
    if (!user || !user.id) {
      return;
    }

    // Set flag bahwa fetch sedang berjalan
    isFetchingRef.current = true;

    try {
      // Tampilkan indikator loading
      setContentLoading(true);
      setError(null);

      // Reset filterChanged state
      setFilterChanged(false);

      // Buat objek filter yang bersih (tanpa nilai 'all')
      // Tetapi tetap kirim string kosong untuk label agar menampilkan semua post
      const cleanFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'label') {
          // Untuk label, kita tetap kirim string kosong
          cleanFilters[key] = value;
        } else if (key === 'role' && value && value !== 'all') {
          // Untuk role, kita kirim sebagai role
          cleanFilters['role'] = value;
        } else if (key === 'featured' && value && value !== 'all') {
          // Untuk featured, kita kirim sebagai featured
          cleanFilters['featured'] = value;
        } else if (key === 'status' && value && value !== 'all') {
          // Untuk status, kita kirim sebagai status
          cleanFilters['status'] = value;
        }
      });

      // Tambahkan sort ke cleanFilters
      cleanFilters['sort'] = sortBy;

      // Tambahkan timestamp untuk menghindari cache
      cleanFilters['_t'] = Date.now();



      // Gunakan try-catch terpisah untuk menangani error API
      try {
        // Panggil API dengan parameter yang benar
        const regularResponse = await getAllPostsAdmin({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          ...cleanFilters,
          sort: sortBy // Pastikan sort dikirim dengan benar
        });

        if (regularResponse && regularResponse.success) {
          if (Array.isArray(regularResponse.data)) {
            // Filter post yang featured dari daftar regular posts
            const regularPostsData = regularResponse.data.filter(post => {
              // Periksa is_featured sebagai boolean atau angka 1
              return !(post.is_featured === true || post.is_featured === 1);
            });

            // Set state dengan data yang diterima
            setRegularPosts(regularPostsData);

            if (regularResponse.pagination) {
              setTotalPages(regularResponse.pagination.totalPages || 1);
              setTotalCount(regularResponse.pagination.totalItems || 0);
            }
          } else {
            setRegularPosts([]);
            setTotalPages(1);
            setTotalCount(0);
          }
        } else {
          setRegularPosts([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      } catch (regularError) {
        console.error('Error fetching regular posts:', regularError);
        setError('Gagal memuat regular posts: ' + regularError.message);
        setRegularPosts([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error in fetchRegularPosts outer try block:', error);
      setError('Gagal memuat data: ' + error.message);
      setRegularPosts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setContentLoading(false);
      // Reset flag bahwa fetch sudah selesai
      isFetchingRef.current = false;
    }
  }, [currentPage, filters, ITEMS_PER_PAGE, sortBy, user?.id]); // Tambahkan user?.id ke dependency array

  // useEffect untuk inisialisasi - DISEDERHANAKAN
  useEffect(() => {
    // Langsung set initialLoading ke false setelah komponen dimount
    // Ini akan memicu useEffect tab switching untuk mengambil data
    setInitialLoading(false);
  }, []); // Tidak perlu dependency

  // Helper function untuk handle auth error
  const handleAuthError = async (error) => {
    try {
      if (error.response?.status === 401) {
        // Coba refresh token hanya jika error 401
        await refreshToken();
        await fetchRegularPosts();
      } else {
        // Untuk error lain, tampilkan pesan error biasa
        console.error('Error:', error);
        setError('Terjadi kesalahan saat memuat data');
      }
    } catch (refreshError) {
      if (refreshError.response?.status === 401) {
        // Logout hanya jika refresh token juga expired
        const message = 'Sesi Anda telah berakhir. Silakan login kembali.';
        alert(message);
        logout();
        navigate('/login', {
          state: {
            message: 'Silakan login kembali untuk melanjutkan.',
            returnTo: '/admin/posts'
          }
        });
      }
    }
  };

  // Modifikasi performAdvancedSearch yang sudah ada
  const performAdvancedSearch = useCallback(async (searchParams) => {
    if (!searchParams?.q || searchParams.q.length < 2) {
      setIsSearching(false);
      return;
    }

    // Jangan lakukan fetch jika sudah ada fetch yang berjalan
    if (isFetchingRef.current) {
      console.log('Fetch sudah berjalan, menghindari multiple fetch dari performAdvancedSearch');
      return;
    }

    try {
      // Set flag bahwa fetch sedang berjalan
      isFetchingRef.current = true;
      setContentLoading(true);
      setError(null);

      const response = await advancedSearch({
        q: searchParams.q.trim(),
        page: searchParams.page || 1,
        limit: ITEMS_PER_PAGE,
        filters: {
          status: searchParams.filters?.status || filters.status,
          label: searchParams.filters?.label || filters.label,
          featured: searchParams.filters?.featured || filters.featured,
          sort: searchParams.filters?.sort || sortBy
        }
      });

      if (response.success) {
        setRegularPosts(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalCount(response.pagination.totalItems);
        setCurrentPage(searchParams.page || 1);
      }
    } catch (error) {
      // Log ini penting untuk debugging error saat melakukan pencarian
      console.error('Search error:', error);
      setError('Gagal melakukan pencarian');
    } finally {
      setContentLoading(false);
      // Reset flag bahwa fetch sudah selesai
      isFetchingRef.current = false;
    }
  }, [filters, sortBy, ITEMS_PER_PAGE]);

  // Fungsi handleSearchInputChange tidak digunakan karena kita menggunakan SearchBar

  // Fungsi untuk menangani pencarian dari SearchBar
  const handleSearch = (searchTerm, labelId) => {
    setSearchInput(searchTerm);

    // Pastikan labelId yang kosong diatur sebagai string kosong
    // untuk menampilkan semua post
    setFilters(prev => ({
      ...prev,
      label: labelId === '' ? '' : labelId
    }));

    // Jangan lakukan fetch jika sudah ada fetch yang berjalan
    if (isFetchingRef.current) {
      return;
    }

    if (!searchTerm || searchTerm.length < 2) {
      setIsSearching(false);
      // Gunakan setTimeout untuk mencegah multiple fetching
      setTimeout(() => {
        if (!contentLoading) {
          fetchRegularPosts();
        }
      }, 100);
    } else {
      setIsSearching(true);
      performAdvancedSearch({
        q: searchTerm,
        page: 1,
        filters: {
          status: filters.status,
          label: labelId === '' ? '' : labelId,
          featured: filters.featured,
          sort: sortBy
        }
      });
    }
  };

  // Tambahkan cleanup untuk searchTimeoutRef
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fungsi handleSearchSubmit tidak digunakan karena kita menggunakan SearchBar

  // State untuk melacak apakah filter/sort telah berubah tetapi belum diterapkan
  const [filterChanged, setFilterChanged] = useState(false);

  // Modifikasi handleFilterChange agar tidak merender post secara otomatis
  const handleFilterChange = (type, value) => {
    // Hanya update state filters tanpa merender ulang
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));

    // Tandai bahwa filter telah berubah
    setFilterChanged(true);

    // Reset ke halaman 1 saat filter berubah
    setCurrentPage(1);

    // Jangan panggil fetchRegularPosts di sini
    // Fetch akan dilakukan saat tombol Terapkan Filter diklik
  };

  // Modifikasi handleSortChange agar tidak merender post secara otomatis
  const handleSortChange = (newSortValue) => {
    // Update state sortBy tanpa merender ulang
    setSortBy(newSortValue);
    // Log ini penting untuk debugging perubahan sort
    console.log('Sort changed to:', newSortValue);

    // Tandai bahwa filter telah berubah
    setFilterChanged(true);

    // Reset ke halaman 1 saat sort berubah
    setCurrentPage(1);
  };







  // Modifikasi handleToggleFeatured untuk memperbarui UI dengan benar
  const handleToggleFeatured = async (postId, currentStatus) => {
    try {
      setIsTransitioning(true); // Tambahkan state transisi untuk mencegah kedipan

      const newStatus = !currentStatus;
      const response = await toggleFeaturedPost(postId, newStatus);

      if (response && response.success) {
        toast.success(
          newStatus
            ? 'Post berhasil dijadikan featured!'
            : 'Post berhasil dihapus dari featured!'
        );

        // Update UI secara lokal terlebih dahulu
        if (newStatus) {
          // Jika post dijadikan featured, update featured post
          const postToFeature = regularPosts.find(p => p.id === postId);
          if (postToFeature) {
            setFeaturedPost({...postToFeature, is_featured: true});
            // Hapus dari regular posts
            setRegularPosts(prev => prev.filter(p => p.id !== postId));
          }
        } else {
          // Jika post dihapus dari featured, tambahkan ke regular posts
          if (featuredPost && featuredPost.id === postId) {
            const unfeaturedPost = {...featuredPost, is_featured: false};
            setRegularPosts(prev => [unfeaturedPost, ...prev]);
            setFeaturedPost(null);
          }
        }

        // Kemudian refresh data dari server
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
      } else {
        toast.error(response?.message || 'Gagal mengubah status featured post');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Terjadi kesalahan saat mengubah status featured post');
    } finally {
      // Tunggu sebentar sebelum menghilangkan state transisi
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }
  };

  // Fungsi ensurePostData tidak digunakan

  const getLabelText = useCallback((post) => {
    if (post.labels && Array.isArray(post.labels) && post.labels.length > 0) {
      return post.labels.map(label =>
        label.label ? label.label.toUpperCase() : ''
      ).filter(Boolean).join(', ');
    }
    return '';
  }, []);

  // Gunakan getImageUrl yang diimpor dari '../utils/imageHelper'
  // dan tambahkan parameter version untuk cache busting
  const getPostImageUrl = useCallback((imagePath, postId) => {
    if (!imagePath) return '/default-fallback-image.jpg';

    try {
      const version = imageVersions[postId] || Date.now();

      // Bersihkan URL dari duplikasi localhost atau backend URL
      let cleanPath = imagePath.replace(/^http:\/\/localhost:5000\/uploads\//, '');
      cleanPath = cleanPath.replace(/^https:\/\/ghk-tess-backend\.vercel\.app\/uploads\//, '');
      cleanPath = cleanPath.replace(/^uploads\//, '');

      // Pastikan path tidak mengandung URL lengkap ganda
      if (cleanPath.includes('http://localhost:5000')) {
        cleanPath = cleanPath.substring(cleanPath.lastIndexOf('http://localhost:5000/uploads/') + 29);
      }
      if (cleanPath.includes('https://ghk-tess-backend.vercel.app')) {
        cleanPath = cleanPath.substring(cleanPath.lastIndexOf('https://ghk-tess-backend.vercel.app/uploads/') + 43);
      }

      return `${import.meta.env.VITE_API_BASE_URL}/uploads/${cleanPath}?v=${version}`;
    } catch (error) {
      // Log ini penting untuk debugging error saat menghasilkan URL gambar
      console.error('Error generating image URL:', error);
      return '/default-fallback-image.jpg';
    }
  }, [imageVersions]);

  const handleEdit = useCallback((postId, e) => {
    e.stopPropagation();
    navigate(`/admin/edit-post/${postId}`);
  }, [navigate]);

  const handleImageError = useCallback((postId) => {
    // Log ini penting untuk debugging masalah loading gambar
    console.log('Image load error for post:', postId);
    setImageLoadErrors(prev => ({
      ...prev,
      [postId]: true
    }));
  }, []);

  // Perbaikan fungsi handleSoftDelete
  const handleSoftDelete = async (postId, e) => {
    if (e) e.preventDefault();

    try {
      if (!window.confirm('Apakah Anda yakin ingin menghapus post ini?')) {
        return;
      }

      setContentLoading(true);
      await refreshCsrfToken();

      const response = await softDeletePost(postId);

      if (response.success) {
        // Hapus post dari daftar regular posts
        setRegularPosts(prevPosts =>
          prevPosts.filter(post => post.id !== postId)
        );

        // Jika post yang dihapus adalah featured post, reset featured post
        if (featuredPost && featuredPost.id === postId) {
          setFeaturedPost(null);
        }

        // Perbarui total count
        setTotalCount(prev => prev - 1);

        toast.success('Post berhasil dihapus');
      }
    } catch (error) {
      // Log ini penting untuk debugging error saat menghapus post
      console.error('Error soft deleting post:', error);

      if (error.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Anda akan dialihkan ke halaman login.');
        // Handle logout jika diperlukan
        logout();
        navigate('/login');
      } else {
        toast.error('Gagal menghapus post: ' + (error.message || 'Terjadi kesalahan'));
      }
    } finally {
      setContentLoading(false);
    }
  };

  // Perbaikan fungsi handleRestore
  const handleRestore = async (postId, e) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin memulihkan postingan ini?')) {
      try {
        setContentLoading(true);
        await refreshCsrfToken();

        const response = await restorePost(postId);

        if (response.success) {
          // Hapus dari daftar deleted posts
          setDeletedPosts(prev => prev.filter(post => post.id !== postId));

          // Tambahkan post yang dipulihkan ke regular posts jika kita berada di tab posts
          if (activeTab === 'posts') {
            // Pastikan post memiliki labels yang benar
            const restoredPost = response.post ? ensureLabels(response.post) : null;
            if (restoredPost) {
              setRegularPosts(prev => [...prev, restoredPost]);
            }
          }

          // Update total count untuk tab deleted posts
          setTotalCount(prev => prev - 1);

          toast.success('Post berhasil dipulihkan');

          // Refresh data jika diperlukan
          if (activeTab === 'posts') {
            fetchRegularPosts();
          }
        }
      } catch (error) {
        // Log ini penting untuk debugging error saat memulihkan post
        console.error('Error restoring post:', error);
        if (error.response?.status === 401) {
          await handleAuthError(error);
        } else {
          toast.error('Gagal memulihkan post: ' + (error.message || 'Terjadi kesalahan'));
        }
      } finally {
        setContentLoading(false);
      }
    }
  };

  // Perbaikan fungsi handlePermanentDelete
  const handlePermanentDelete = async (postId, e) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus post ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        setContentLoading(true);
        await refreshCsrfToken();

        const response = await permanentDeletePost(postId);

        if (response.success) {
          // Hapus dari daftar deleted posts
          setDeletedPosts(prev => prev.filter(post => post.id !== postId));

          // Update total count
          setTotalCount(prev => prev - 1);

          toast.success('Post berhasil dihapus secara permanen');
        }
      } catch (error) {
        // Log ini penting untuk debugging error saat menghapus post secara permanen
        console.error('Error deleting post permanently:', error);
        toast.error('Gagal menghapus post secara permanen: ' + (error.message || 'Terjadi kesalahan'));
      } finally {
        setContentLoading(false);
      }
    }
  };

  // Perbaikan fungsi fetchDeletedPosts
  const fetchDeletedPosts = useCallback(async () => {
    // Jangan lakukan fetch jika sudah ada fetch yang berjalan
    if (isFetchingRef.current) {
      return;
    }

    try {
      // Set flag bahwa fetch sedang berjalan
      isFetchingRef.current = true;
      setContentLoading(true);
      setError(null);

      const response = await getDeletedPosts(currentPage, ITEMS_PER_PAGE);

      if (response.success) {
        // Pastikan data yang diterima adalah array
        const deletedPostsData = Array.isArray(response.data) ? response.data : [];

        // Set data ke state
        setDeletedPosts(deletedPostsData);

        // Update pagination
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.totalItems || 0);
        }
      } else {
        setError('Gagal memuat data post yang dihapus');
      }
    } catch (error) {
      // Log ini penting untuk debugging error saat mengambil post yang dihapus
      console.error('Error fetching deleted posts:', error);
      setError('Gagal memuat data post yang dihapus: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setContentLoading(false);
      // Reset flag bahwa fetch sudah selesai
      isFetchingRef.current = false;
    }
  }, [currentPage, ITEMS_PER_PAGE]);



  // Pagination component is already imported at the top of the file
  // import Pagination from './Pagination';

  // Modifikasi handlePageChange untuk mempertahankan version gambar
  const handlePageChange = useCallback(async (newPage) => {
    if (newPage === currentPage || isTransitioning) return;

    // Jangan lakukan fetch jika sudah ada fetch yang berjalan
    if (isFetchingRef.current) {
      return;
    }

    setIsTransitioning(true);
    try {
      // Scroll ke atas dengan animasi halus
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      setCurrentPage(newPage);
      await fetchRegularPosts();
    } catch (error) {
      // Log ini penting untuk debugging error saat mengubah halaman
      console.error('Error changing page:', error);
      setError('Gagal mengubah halaman');
    } finally {
      setIsTransitioning(false);
    }
  }, [currentPage, isTransitioning, fetchRegularPosts]);

  // Hapus useEffect ini karena kita sudah menangani reset halaman di handleFilterChange
  // dan kita tidak ingin melakukan fetch otomatis saat filter berubah

  // Hapus useEffect duplikat ini karena sudah ada useEffect untuk tab switching di bawah
  // yang melakukan hal yang sama

  // Tambahkan event listener untuk menutup dropdown filter ketika user mengklik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);


    // Catatan: handleStorageChange sudah didefinisikan di useEffect di bawah

  // Modifikasi useEffect untuk mendengarkan perubahan gambar
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'imageUpdated') {
        try {
          const updatedData = JSON.parse(e.newValue || '{}');

          if (updatedData.postId) {
            // Update updatedImages set
            setUpdatedImages(prev => new Set([...prev, updatedData.postId]));

            // Update image versions untuk cache busting
            setImageVersions(prev => ({
              ...prev,
              [updatedData.postId]: Date.now()
            }));

            // Gunakan setTimeout untuk mencegah multiple state updates
            setTimeout(() => {
              // Gunakan refreshTrigger untuk memicu fetch
              setRefreshTrigger(prev => prev + 1);
            }, 300);
          }
        } catch (error) {
          // Log ini penting untuk debugging error saat menangani perubahan storage
          console.error('Error handling storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Modifikasi useEffect untuk tab switching dan inisialisasi data
  useEffect(() => {
    // Jangan jalankan jika masih dalam initialLoading
    if (initialLoading) return;

    setContentLoading(true);

    // Fungsi untuk mengambil data berdasarkan tab aktif
    const fetchDataForActiveTab = async () => {
      try {
        if (activeTab === 'deleted-posts') {
          await fetchDeletedPosts();
        } else if (activeTab === 'posts') {
          // Ambil labels terlebih dahulu
          try {
            await fetchLabels();
          } catch (labelError) {
            console.error('Error fetching labels:', labelError);
          }

          // Kemudian ambil regular posts
          try {
            await fetchRegularPosts();
          } catch (postsError) {
            console.error('Error fetching regular posts:', postsError);
          }

          // Terakhir ambil featured post
          try {
            await fetchFeaturedPost();
          } catch (featuredError) {
            console.error('Error fetching featured post:', featuredError);
          }
        }
      } catch (error) {
        // Log ini penting untuk debugging error saat mengambil data untuk tab aktif
        console.error(`Error fetching data for tab ${activeTab}:`, error);
        setError(`Gagal memuat data untuk tab ${activeTab}: ${error.message}`);
      } finally {
        setContentLoading(false);
      }
    };

    // Jalankan fetch data
    fetchDataForActiveTab();

  }, [activeTab, initialLoading, user?.id]); // Tambahkan initialLoading dan user?.id ke dependency array

  useEffect(() => {
    const checkForUpdates = () => {
      const updatedPostData = sessionStorage.getItem('updatedPost');
      if (updatedPostData) {
        try {
          const updatedPost = JSON.parse(updatedPostData);

          // Update regular posts dan featured post secara lokal
          setRegularPosts(prevPosts =>
            prevPosts.map(post =>
              post.id === updatedPost.id
                ? { ...post, ...updatedPost }
                : post
            )
          );

          if (featuredPost?.id === updatedPost.id) {
            setFeaturedPost(prev => ({
              ...prev,
              ...updatedPost
            }));
          }

          // Clear sessionStorage
          sessionStorage.removeItem('updatedPost');

          // Hanya fetch ulang jika benar-benar diperlukan
          if (updatedPost.requiresRefresh) {
            // Gunakan refreshTrigger untuk memicu fetch daripada memanggil fetchRegularPosts langsung
            // Gunakan setTimeout untuk mencegah multiple state updates
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 300);
          }
        } catch (error) {
          // Log ini penting untuk debugging error saat parsing data post yang diupdate
          console.error('Error parsing updated post data:', error);
        }
      }
    };

    // Jalankan checkForUpdates hanya ketika location berubah
    if (location) {
      checkForUpdates();
    }
  }, [location, featuredPost?.id]); // Tambahkan featuredPost?.id ke dependency array

  // Tambahkan CSS class untuk highlight post yang baru diupdate
  const getPostClassName = (postId) => {
    let className = 'admin-post-item';
    if (lastUpdatedPost === postId) {
      className += ' post-updated';
    }
    return className;
  };

  // Fungsi stripHtmlTags sudah dipindahkan ke utils/textUtils.js

  // Fungsi untuk mengubah view mode
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    // Simpan preferensi view mode di localStorage
    localStorage.setItem('adminPostsViewMode', mode);
  };

  // Perbaikan fungsi fetchFeaturedPost
  const fetchFeaturedPost = useCallback(async () => {
    // Jika tidak ada user, jangan lakukan fetch
    if (!user || !user.id) {
      return;
    }

    try {
      // Set flag bahwa fetch sedang berjalan untuk featured post
      setFeaturedLoading(true);

      const response = await getAdminFeaturedPost();

      // Periksa struktur respons
      if (response && response.success) {
        // Periksa apakah data ada di response.data atau langsung di response
        const featuredData = response.data;

        if (featuredData) {
          // Validasi data featured post
          if (featuredData.id && featuredData.title) {
            setFeaturedPost(featuredData);
          } else if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].id) {
            setFeaturedPost(featuredData[0]);
          } else {
            setFeaturedPost(null);
          }
        } else {
          setFeaturedPost(null);
        }
      } else {
        setFeaturedPost(null);
      }
    } catch (error) {
      console.error('Error in fetchFeaturedPost:', error);
      setFeaturedPost(null);
    } finally {
      setFeaturedLoading(false);
    }
  }, [user?.id]); // Tambahkan user?.id ke dependency array

  // Featured post sudah diambil di useEffect tab switching

  // Gunakan useEffect dengan refreshTrigger sebagai dependency
  useEffect(() => {
    // Hanya jalankan effect ini jika refreshTrigger > 0 (bukan saat initial render)
    // dan user sudah terautentikasi
    if (refreshTrigger > 0 && user?.id) {
      // Tambahkan delay kecil untuk menghindari kedipan
      const timer = setTimeout(async () => {
        // Gunakan flag untuk mencegah multiple fetching
        if (!isFetchingRef.current) {
          try {
            // Panggil fetchRegularPosts secara langsung tanpa mengubah state lain
            await fetchRegularPosts();

            // Juga refresh featured post
            await fetchFeaturedPost();
          } catch (error) {
            console.error('Error refreshing posts:', error);
          }
        }
      }, 300);

      // Cleanup function untuk mencegah race condition
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger, user?.id]); // Tambahkan user?.id ke dependency array


  // Fungsi handlePostClick sudah dipindahkan ke komponen PostItem

  // Fungsi renderPost untuk menampilkan post dengan PostItem
  const renderPost = (post, isFeatured = false) => {
    if (!post) {
      return null;
    }

    return (
      <PostItem
        key={`post-${post.id}-${isFeatured ? 'featured' : 'regular'}`}
        post={post}
        isFeatured={isFeatured}
        user={user}
        getImageUrl={getPostImageUrl}
        getLabelText={getLabelText}
        getStatusClass={getStatusClass}
        getPostClassName={getPostClassName}
        imageVersions={imageVersions}
        handleImageError={handleImageError}
        handleToggleFeatured={handleToggleFeatured}
        handleEdit={handleEdit}
        handleRestore={handleRestore}
        handlePermanentDelete={handlePermanentDelete}
        handleSoftDelete={handleSoftDelete}
        ensurePostStatus={ensurePostStatus}
      />
    );
  };

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat halaman...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className={`admin-posts-container ${isTransitioning ? 'transitioning' : ''}`} role="main" aria-label="Halaman Admin Posts">
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <nav className="admin-nav">
            <Link
              to="/dashboard"
              className="admin-nav-button"
            >
              Dashboard
            </Link>
            <button
              className={`admin-nav-button ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Postingan
            </button>
            {user?.role === 'admin' && (
              <>
                <button
                  className={`admin-nav-button ${activeTab === 'deleted-posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('deleted-posts')}
                >
                  Post Terhapus
                </button>

                <button
                  className={`admin-nav-button ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  Kelola Users
                </button>

                <button
                  className={`admin-nav-button ${activeTab === 'carousel' ? 'active' : ''}`}
                  onClick={() => setActiveTab('carousel')}
                >
                  Kelola Carousel
                </button>

                <button
                  className={`admin-nav-button ${activeTab === 'footer' ? 'active' : ''}`}
                  onClick={() => setActiveTab('footer')}
                >
                  Kelola Footer
                </button>
              </>
            )}
          </nav>

          {initialLoading ? (
            <div className="admin-loading">
              <div className="loading-spinner"></div>
              <p>Memuat data awal...</p>
            </div>
          ) : (
            <>
              {activeTab === 'posts' && (
                <div className="admin-posts">
                  <div className="admin-posts-header">
                    <div className="admin-title-section">
                      <div className="admin-posts-header-title">
                        <h2 className="admin-posts-title">Semua Postingan</h2>
                        <div className="admin-posts-counter">{totalCount}</div>
                      </div>

                      <div className="admin-posts-controls">
                        <SearchBar
                          searchTerm={searchInput}
                          selectedLabel={filters.label}
                          labels={labels}
                          onSearch={handleSearch}
                          viewMode={viewMode}
                          onViewModeChange={handleViewModeChange}
                          newPostButton={
                            <Link to="/admin/add-post" className="admin-new-post-button">
                              Buat Postingan Baru
                            </Link>
                          }
                          isAdmin={true} // Gunakan mode admin
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`admin-posts-list ${isTransitioning ? 'transitioning' : ''}`}>
                    {/* Featured Post Section */}
                    <div className={`admin-featured-post-section ${showFeatured ? 'show' : 'hide'}`}>
                      <div className="admin-featured-section-header">
                        <h3>Featured Post</h3>
                        {featuredLoading && <div className="loading-spinner small"></div>}
                        <button
                          className="admin-featured-toggle-button"
                          onClick={() => setShowFeatured(!showFeatured)}
                          title={showFeatured ? "Sembunyikan Featured Post" : "Tampilkan Featured Post"}
                        >
                          {showFeatured ? '×' : '↓'}
                        </button>
                      </div>

                      {showFeatured && (
                        <>
                          {featuredLoading ? (
                            <div className="admin-loading-featured">
                              <span>Memuat featured post...</span>
                            </div>
                          ) : featuredPost ? (
                            <div className="featured-post-container">
                              {renderPost(featuredPost, true)}
                            </div>
                          ) : (
                            <div className="admin-no-featured-post">
                              <p>Tidak ada post yang di-featured saat ini</p>
                              <p className="admin-featured-hint">
                                Klik ikon bintang pada post untuk menjadikannya featured
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Regular Posts Section */}
                    <div className={`regular-posts-section ${viewMode}-view`}>
                      <div className="regular-posts-header">
                        <h3>Regular Posts</h3>
                        <div className="filter-dropdown-container">
                          <button
                            className="filter-dropdown-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // Mencegah event bubbling
                              // Gunakan functional update untuk mencegah closure issues
                              setShowFilterDropdown(prev => !prev);
                            }}
                          >
                            <FiFilter />
                            <span>Filter</span>
                          </button>
                          {showFilterDropdown && (
                            // Gunakan React.memo untuk mencegah render ulang yang tidak perlu
                            <div className="filter-dropdown-menu">
                              <div className="filter-dropdown-item">
                                <label htmlFor="status-filter-dropdown">Status:</label>
                                <select
                                  id="status-filter-dropdown"
                                  value={filters.status}
                                  onChange={(e) => handleFilterChange('status', e.target.value)}
                                  className="admin-status-filter"
                                >
                                  <option value="all">Semua Status</option>
                                  <option value="published">Published</option>
                                  <option value="draft">Draft</option>
                                  <option value="archived">Archived</option>
                                </select>
                              </div>
                              <div className="filter-dropdown-item">
                                <label htmlFor="role-filter-dropdown">User:</label>
                                <select
                                  id="role-filter-dropdown"
                                  value={filters.role}
                                  onChange={(e) => handleFilterChange('role', e.target.value)}
                                  className="admin-status-filter"
                                >
                                  <option value="all">Semua User</option>
                                  <option value="admin">Admin</option>
                                  <option value="writer">Writer</option>
                                </select>
                              </div>
                              <div className="filter-dropdown-item">
                                <label htmlFor="sort-filter-dropdown">Urutkan:</label>
                                <select
                                  id="sort-filter-dropdown"
                                  value={sortBy}
                                  onChange={(e) => handleSortChange(e.target.value)}
                                  className="admin-status-filter"
                                >
                                  <option value="created_at:desc">Terbaru</option>
                                  <option value="created_at:asc">Terlama</option>
                                  <option value="views:desc">Terbanyak Dilihat</option>
                                  <option value="title:asc">Judul (A-Z)</option>
                                </select>
                              </div>
                              <button
                                className={`apply-filter-dropdown-button ${filterChanged ? 'filter-changed' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation(); // Mencegah event bubbling

                                  // Log filter dan sort yang akan diterapkan
                                  console.log('Applying filters:', filters);
                                  console.log('Applying sort:', sortBy);

                                  // Tutup dropdown sebelum fetch untuk mencegah render ulang yang tidak perlu
                                  setShowFilterDropdown(false);

                                  // Reset filterChanged state
                                  setFilterChanged(false);

                                  // Gunakan setTimeout dengan delay yang lebih lama untuk memastikan dropdown sudah tertutup sebelum fetch
                                  // dan mencegah multiple fetching
                                  if (!contentLoading) {
                                    setTimeout(() => {
                                      // Reset featured loading untuk mencegah render ulang yang tidak perlu
                                      setFeaturedLoading(false);
                                      // Panggil fetchRegularPosts untuk menerapkan filter
                                      fetchRegularPosts();
                                    }, 100);
                                  }
                                }}
                              >
                                {filterChanged ? 'Terapkan Perubahan' : 'Terapkan Filter'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="posts-container">
                        {contentLoading ? (
                          <div className="admin-loading">
                            <div className="loading-spinner"></div>
                            <p>Memuat data dengan filter yang dipilih...</p>
                          </div>
                        ) : regularPosts && regularPosts.length > 0 ? (
                          <>
                            {regularPosts.map(post => {
                              if (!post || !post.id) {
                                return null;
                              }
                              return renderPost(post);
                            })}
                          </>
                        ) : (
                          <>
                            <div className="no-posts">Tidak ada postingan yang tersedia</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>


                  <div className="pagination-container">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      isTransitioning={isTransitioning}
                    />
                    <div className="pagination-info">
                      {totalCount > 0 ? (
                        `Menampilkan ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${
                          Math.min(currentPage * ITEMS_PER_PAGE, totalCount)
                        } dari ${totalCount} post`
                      ) : (
                        'Tidak ada post yang ditampilkan'
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && user?.role === 'admin' && (
                <div className="admin-posts">
                  <AdminManagerUsers />
                </div>
              )}

              {/* Carousel Tab */}
              {activeTab === 'carousel' && user?.role === 'admin' && (
                <div className="admin-posts">
                  <CarouselManager />
                </div>
              )}

              {/* Footer Tab */}
              {activeTab === 'footer' && user?.role === 'admin' && (
                <div className="admin-posts">
                  <FooterManager />
                </div>
              )}

              {activeTab === 'deleted-posts' && (
                <div className="admin-posts">
                  <div className="admin-posts-header">
                    <h2 className="admin-posts-title">Post Terhapus</h2>
                    <span className="posts-count">({totalCount} post)</span>
                  </div>

                  {contentLoading ? (
                    <div className="admin-posts-skeleton">
                      {Array(5).fill(0).map((_, index) => (
                        <div key={index} className="admin-post-item-skeleton d-flex mb-3">
                          <div className="admin-post-thumbnail-skeleton me-3">
                            <Skeleton height={100} width={150} />
                          </div>
                          <div className="admin-post-content-skeleton flex-grow-1">
                            <Skeleton height={24} width="80%" className="mb-2" />
                            <Skeleton height={16} width="60%" className="mb-2" />
                            <Skeleton height={16} width="40%" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="error-message">{error}</div>
                  ) : deletedPosts.length === 0 ? (
                    <div className="no-deleted-posts">
                      <div className="empty-state">
                        <span className="empty-icon">🗑️</span>
                        <h3>Tidak Ada Post Terhapus</h3>
                        <p>Semua post masih aktif dan dapat diakses</p>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-posts-list">
                      {deletedPosts.map(post => renderPost(post))}

                      <div className="pagination-container">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                          isTransitioning={isTransitioning}
                        />
                        <div className="pagination-info">
                          {`Menampilkan ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} - ${
                            Math.min(currentPage * ITEMS_PER_PAGE, totalCount)
                          } dari ${totalCount} post terhapus`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AdminPosts;
