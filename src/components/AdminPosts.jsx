import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';// Pastikan Anda memiliki fungsi ini di postApi
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getAllPostsAdmin, deletePost, toggleFeaturedPost, getPendingWriters, verifyWriter, rejectWriter, getFeaturedPosts, advancedSearch, getDeletedPosts, getAdminFeaturedPost } from '../api/postApi';
import userService from '../services/userService';
import moment from 'moment';
import { debounce } from 'lodash';
import './AdminPosts.css';
import { api } from '../api/axios';
import { refreshCsrfToken } from '../api/auth';
import { getLabels, searchLabels } from '../api/labelApi';
import NestedDropdown from './NestedDropdown'; // Ganti import SearchBar dengan NestedDropdown
import { getAccessToken, refreshToken, checkTokenValidity } from '../utils/tokenManager'; // Tambahkan import ini
import AdminManagerUsers from './AdminManagerUsers'; // Tambahkan import ini
import CarouselManager from './Admin/CarouselManager'; // Import CarouselManager
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import Pagination from './Pagination';
import { getImageUrl } from '../utils/imageHelper';
import { getCurrentUser } from '../api/auth';
import { toast } from 'react-hot-toast';
import {
  softDeletePost,
  restorePost,
  permanentDeletePost
} from '../api/postApi';
import { FiRefreshCw, FiCheckCircle, FiThumbsUp, FiThumbsDown, FiUsers } from 'react-icons/fi';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allRegularPosts, setAllRegularPosts] = useState([]);
  const [pendingWriters, setPendingWriters] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('posts');
  const [pendingWritersError, setPendingWritersError] = useState(null);
  const [processingWriters, setProcessingWriters] = useState({});
  const [selectedLabel, setSelectedLabel] = useState('');
  const [labels, setLabels] = useState([]);
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all',
    label: '',
    featured: 'all'
  });
  const [sortBy, setSortBy] = useState('date');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const { user, refreshAuthState, logout } = useAuth();
  const navigate = useNavigate();

  const searchTimeoutRef = useRef(null);
  const filterTimeoutRef = useRef(null);
  const authCheckRef = useRef(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  // Tambahkan state untuk transisi
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Tambahkan state untuk loading dropdown
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Tambahkan state untuk mengontrol visibility
  const [showFeatured, setShowFeatured] = useState(true);

  // Tambahkan state untuk deleted posts
  const [deletedPosts, setDeletedPosts] = useState([]);

  const location = useLocation();
  const { state } = location;

  const [posts, setPosts] = useState([]);

  const [imageVersion, setImageVersion] = useState(Date.now());

  const [imageLoadErrors, setImageLoadErrors] = useState({});

  // Tambahkan state untuk tracking gambar yang diupdate
  const [updatedImages, setUpdatedImages] = useState(new Set());
  const [imageVersions, setImageVersions] = useState({});

  // Tambahkan state untuk tracking post yang diupdate
  const [lastUpdatedPost, setLastUpdatedPost] = useState(null);

  const [featuredLoading, setFeaturedLoading] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const lastUpdatedPost = sessionStorage.getItem('lastUpdatedPost');
    if (lastUpdatedPost) {
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

      // Bersihkan sessionStorage
      sessionStorage.removeItem('lastUpdatedPost');
    }
  }, [location, featuredPost]);

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

  // Perbaikan fungsi fetchPendingWriters
  const fetchPendingWriters = useCallback(async () => {
    try {
      console.log('Fetching pending writers...');
      const response = await api.get('/api/auth/pending-writers');
      console.log('Pending writers response:', response.data);

      // Filter penulis yang belum diverifikasi dan belum disetujui
      const pendingWriters = response.data.filter(writer =>
        writer.role === 'writer' &&
        (!writer.is_verified || !writer.is_approved)
      );

      console.log('Filtered pending writers:', pendingWriters);
      setPendingWriters(pendingWriters || []);
    } catch (error) {
      setPendingWritersError('Gagal memuat daftar penulis pending');
      console.error('Error fetching pending writers:', error);
    }
  }, []);


  const fetchRegularPosts = useCallback(async () => {
    try {
      setContentLoading(true);
      setError(null);

      // Gunakan Promise.all untuk menjalankan kedua request secara paralel
      const [featuredResponse, regularResponse] = await Promise.all([
        getAdminFeaturedPost(),
        getAllPostsAdmin({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          ...filters
        })
      ]);

      console.log('Featured response raw:', featuredResponse);

      // Proses featured post
      if (featuredResponse.success && featuredResponse.data) {
        // Periksa apakah data adalah array atau objek tunggal
        if (Array.isArray(featuredResponse.data)) {
          // Jika array, periksa apakah ada elemen dan apakah elemen pertama featured
          if (featuredResponse.data.length > 0) {
            const firstPost = featuredResponse.data[0];
            // Periksa is_featured sebagai boolean atau angka 1
            if (firstPost.is_featured === true || firstPost.is_featured === 1) {
              console.log('Setting featured post from array:', firstPost);
              setFeaturedPost(firstPost);
            } else {
              console.log('First post in array is not featured:', firstPost);
              setFeaturedPost(null);
            }
          } else {
            console.log('Featured data is empty array');
            setFeaturedPost(null);
          }
        } else {
          // Jika objek tunggal, periksa apakah objek tersebut featured
          const postObject = featuredResponse.data;
          // Periksa is_featured sebagai boolean atau angka 1
          if (postObject.is_featured === true || postObject.is_featured === 1) {
            console.log('Setting featured post from object:', postObject);
            setFeaturedPost(postObject);
          } else {
            console.log('Post object is not featured:', postObject);
            setFeaturedPost(null);
          }
        }
      } else {
        console.log('No featured post data in response');
        setFeaturedPost(null);
      }

      // Proses regular posts
      if (regularResponse.success) {
        // Filter post yang featured dari daftar regular posts
        const regularPostsData = regularResponse.data.filter(post => {
          // Periksa is_featured sebagai boolean atau angka 1
          return !(post.is_featured === true || post.is_featured === 1);
        });
        console.log('Regular posts filtered:', regularPostsData.length);
        setRegularPosts(regularPostsData);
        setTotalPages(regularResponse.pagination.totalPages);
        setTotalCount(regularResponse.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Gagal memuat data: ' + error.message);
    } finally {
      setContentLoading(false);
    }
  }, [currentPage, filters, ITEMS_PER_PAGE]);

  // useEffect untuk inisialisasi
  useEffect(() => {
    let isMounted = true;

    const initializeComponent = async () => {
      try {
        if (isMounted) {
          await fetchRegularPosts();
          await fetchLabels();
          if (user?.role === 'admin') {
            await fetchPendingWriters();
          }
        }
      } catch (error) {
        if (isMounted) {
          if (error.response?.status === 401) {
            handleAuthError(error);
          } else {
            setError('Gagal memuat data: ' + error.message);
          }
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    initializeComponent();

    return () => {
      isMounted = false;
    };
  }, [fetchRegularPosts, fetchLabels, fetchPendingWriters, user]);

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

    try {
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
      console.error('Search error:', error);
      setError('Gagal melakukan pencarian');
    } finally {
      setContentLoading(false);
    }
  }, [filters, sortBy, ITEMS_PER_PAGE]);

  // Modifikasi handleSearchInputChange yang sudah ada
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear timeout sebelumnya
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set timeout baru untuk debounce
    searchTimeoutRef.current = setTimeout(() => {
      if (!value || value.length < 2) {
        setIsSearching(false);
        fetchRegularPosts();
      } else {
        setIsSearching(true);
        performAdvancedSearch({
          q: value,
          page: 1,
          filters: {
            status: filters.status,
            label: filters.label,
            featured: filters.featured,
            sort: sortBy
          }
        });
      }
    }, 500);
  };

  // Tambahkan cleanup untuk searchTimeoutRef
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fungsi untuk handle submit search
  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    if (searchInput.trim().length < 2) {
      return;
    }

    setIsSearching(true);
    performAdvancedSearch({
      q: searchInput.trim(),
      page: 1,
      filters: {
        status: filters.status,
        label: filters.label,
        featured: filters.featured,
        sort: sortBy
      }
    });
  };

  // Modifikasi handleFilterChange
  const handleFilterChange = async (type, value) => {
    try {
      setContentLoading(true);
      setError(null);

      const newFilters = {
        ...filters,
        [type]: value
      };
      setFilters(newFilters);

      // Reset ke halaman 1 saat filter berubah
      setCurrentPage(1);

      // Ambil featured post terlebih dahulu jika tidak dalam mode filter featured
      if (type !== 'featured' || value === 'all') {
        const featuredResponse = await getAllPostsAdmin({
          page: 1,
          limit: 1,
          featured: 'featured'
        });

        if (featuredResponse.success && featuredResponse.data?.length > 0) {
          setFeaturedPost(featuredResponse.data[0]);
        } else {
          setFeaturedPost(null);
        }
      }

      // Ambil regular posts sesuai filter
      const params = {
        page: 1,
        limit: ITEMS_PER_PAGE,
        ...newFilters,
        featured: value === 'all' ? undefined : value
      };

      const response = await getAllPostsAdmin(params);

      if (response.success) {
        const regularPostsData = type === 'featured' ? response.data :
          response.data.filter(post => !post.is_featured);

        // Update versi gambar saat filter berubah
        setImageVersion(Date.now());
        setRegularPosts(regularPostsData);
        setTotalPages(response.pagination.totalPages);
        setTotalCount(response.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error changing filter:', error);
      setError('Gagal mengubah filter');
    } finally {
      setContentLoading(false);
    }
  };

  // Modifikasi handleSortChange
  const handleSortChange = async (newSortValue) => {
    try {
      setLoading(true);
      setError(null);

      const sortMapping = {
        'date': 'publish_date:desc',
        'oldest': 'publish_date:asc',
        'views': 'views:desc',
        'featured': 'is_featured:desc',
        'spotlight': 'is_spotlight:desc',
        'title': 'title:asc'
      };

      const sortParam = sortMapping[newSortValue] || 'publish_date:desc';

      const response = await api.get('/api/posts', {
        params: {
          status: filters.status || 'all',
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          include_labels: true,
          sort: sortParam,
          admin: true
        }
      });

      if (response.data?.data) {
        const posts = response.data.data;
        const featured = posts.find(post => post.is_featured);
        const regular = posts.filter(post => !post.is_featured);

        setFeaturedPost(featured);
        setRegularPosts(regular);
        setTotalPages(Math.ceil(response.data.pagination.total / ITEMS_PER_PAGE));
        setTotalCount(response.data.pagination.total);
        setSortBy(newSortValue);
      }
    } catch (error) {
      console.error('Error sorting posts:', error);
      setError('Gagal mengurutkan post');
    } finally {
      setLoading(false);
    }
  };

  // Perbaikan fungsi handleApproveWriter
  const handleApproveWriter = async (writerId) => {
    try {
      setProcessingWriters(prev => ({ ...prev, [writerId]: 'approving' }));

      // Refresh CSRF token
      await refreshCsrfToken();

      // Dapatkan token dari localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
        return;
      }

      console.log('Approving writer:', writerId);

      // Gunakan axios langsung dengan konfigurasi yang benar
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/approve-writer/${writerId}`,
        {}, // body kosong
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1]
          },
          withCredentials: true
        }
      );

      console.log('Approve writer response:', response.data);

      if (response.data && response.data.message) {
        toast.success(response.data.message);
        // Hapus penulis yang disetujui dari daftar
        setPendingWriters(prev => prev.filter(writer => writer.id !== writerId));
      } else {
        throw new Error('Respons tidak valid dari server');
      }
    } catch (error) {
      console.error('Error approving writer:', error);

      if (error.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
      } else {
        toast.error(`Gagal menyetujui penulis: ${error.response?.data?.message || error.message || 'Terjadi kesalahan'}`);
      }
    } finally {
      setProcessingWriters(prev => ({ ...prev, [writerId]: null }));
    }
  };

  // Perbaikan fungsi handleVerifyWriter
  const handleVerifyWriter = async (writerId) => {
    try {
      setProcessingWriters(prev => ({ ...prev, [writerId]: 'verifying' }));

      // Refresh CSRF token
      await refreshCsrfToken();

      // Dapatkan token menggunakan fungsi getAccessToken
      let finalToken = getAccessToken();

      // Jika tidak ada token, coba ambil dari sessionStorage langsung
      if (!finalToken) {
        const sessionToken = sessionStorage.getItem('accessToken');
        if (sessionToken) {
          try {
            const parsed = JSON.parse(sessionToken);
            if (parsed && parsed.token) {
              finalToken = parsed.token;
            }
          } catch (e) {
            console.error('Error parsing session token:', e);
          }
        }
      }

      // Jika masih tidak ada token, coba ambil dari localStorage
      if (!finalToken) {
        const localToken = localStorage.getItem('accessToken');
        if (localToken) {
          try {
            const parsed = JSON.parse(localToken);
            if (parsed && parsed.token) {
              finalToken = parsed.token;
            }
          } catch (e) {
            console.error('Error parsing local token:', e);
          }
        }
      }

      // Jika masih tidak ada token, coba ambil dari cookie
      if (!finalToken) {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        if (cookieToken) {
          finalToken = cookieToken;
        }
      }

      if (!finalToken) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
        return;
      }

      console.log('Verifying writer:', writerId);

      try {
        // Gunakan axios dengan konfigurasi yang benar
        const response = await axios({
          method: 'post',
          url: `${import.meta.env.VITE_API_URL}/api/auth/verify-writer/${writerId}`,
          headers: {
            'Authorization': `Bearer ${finalToken}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.cookie
              .split('; ')
              .find(row => row.startsWith('XSRF-TOKEN='))
              ?.split('=')[1]
          },
          withCredentials: true
        });

        console.log('Verification response:', response.data);

        if (response.data) {
          // Tampilkan pesan sukses
          toast.success(response.data.message || 'Writer berhasil diverifikasi');

          // Hapus writer yang sudah diverifikasi dari state
          setPendingWriters(prev => prev.filter(writer => writer.id !== writerId));

          // Refresh daftar penulis pending
          fetchPendingWriters();
        } else {
          throw new Error('Respons tidak valid dari server');
        }
      } catch (error) {
        console.error('Error verifying writer:', error);

        // Cek apakah token expired
        if (error.response?.status === 401) {
          // Coba refresh token
          try {
            console.log('Attempting to refresh token...');
            // Gunakan fungsi refreshToken dari tokenManager
            const refreshResult = await refreshToken();

            if (refreshResult.success && refreshResult.accessToken) {
              console.log('Token refreshed successfully, retrying verification...');

              // Coba lagi verifikasi writer dengan token baru
              const retryResponse = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/verify-writer/${writerId}`,
                {},
                {
                  headers: {
                    'Authorization': `Bearer ${refreshResult.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.cookie
                      .split('; ')
                      .find(row => row.startsWith('XSRF-TOKEN='))
                      ?.split('=')[1]
                  },
                  withCredentials: true
                }
              );

              console.log('Retry verification response:', retryResponse.data);

              if (retryResponse.data) {
                toast.success(retryResponse.data.message || 'Writer berhasil diverifikasi');
                setPendingWriters(prev => prev.filter(writer => writer.id !== writerId));
                fetchPendingWriters();
                return;
              }
            } else {
              throw new Error('Gagal mendapatkan token baru');
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
            navigate('/login');
            return;
          }
        } else {
          // Jika bukan masalah token
          const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan';
          toast.error(`Gagal memverifikasi penulis: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setProcessingWriters(prev => ({ ...prev, [writerId]: null }));
    }
  };

  const handleRejectWriter = async (writerId) => {
    try {
      setProcessingWriters(prev => ({ ...prev, [writerId]: 'rejecting' }));

      // Refresh CSRF token
      await refreshCsrfToken();

      // Dapatkan token menggunakan fungsi getAccessToken
      let finalToken = getAccessToken();

      // Jika tidak ada token, coba ambil dari sessionStorage langsung
      if (!finalToken) {
        const sessionToken = sessionStorage.getItem('accessToken');
        if (sessionToken) {
          try {
            const parsed = JSON.parse(sessionToken);
            if (parsed && parsed.token) {
              finalToken = parsed.token;
            }
          } catch (e) {
            console.error('Error parsing session token:', e);
          }
        }
      }

      // Jika masih tidak ada token, coba ambil dari localStorage
      if (!finalToken) {
        const localToken = localStorage.getItem('accessToken');
        if (localToken) {
          try {
            const parsed = JSON.parse(localToken);
            if (parsed && parsed.token) {
              finalToken = parsed.token;
            }
          } catch (e) {
            console.error('Error parsing local token:', e);
          }
        }
      }

      // Jika masih tidak ada token, coba ambil dari cookie
      if (!finalToken) {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        if (cookieToken) {
          finalToken = cookieToken;
        }
      }

      if (!finalToken) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
        return;
      }

      console.log('Rejecting writer:', writerId);

      // Gunakan axios langsung dengan konfigurasi yang benar
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/reject-writer/${writerId}`,
        {}, // body kosong
        {
          headers: {
            'Authorization': `Bearer ${finalToken}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1]
          },
          withCredentials: true
        }
      );

      console.log('Reject writer response:', response.data);

      if (response.data && response.data.message) {
        toast.success(response.data.message);
        // Hapus penulis yang ditolak dari daftar
        setPendingWriters(prev => prev.filter(writer => writer.id !== writerId));
      } else {
        throw new Error('Respons tidak valid dari server');
      }
    } catch (error) {
      console.error('Error rejecting writer:', error);

      if (error.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/login');
      } else {
        toast.error(`Gagal menolak penulis: ${error.response?.data?.message || error.message || 'Terjadi kesalahan'}`);
      }
    } finally {
      setProcessingWriters(prev => ({ ...prev, [writerId]: null }));
    }
  };

  // Modifikasi handleToggleFeatured untuk memperbarui UI dengan benar
  const handleToggleFeatured = async (postId, currentStatus) => {
    try {
      setIsTransitioning(true); // Tambahkan state transisi untuk mencegah kedipan

      const newStatus = !currentStatus;
      const response = await toggleFeaturedPost(postId, newStatus);

      if (response.success) {
        toast.success(
          newStatus
            ? 'Post berhasil dijadikan featured!'
            : 'Post berhasil dihapus dari featured!'
        );

        // HANYA trigger refresh dengan mengubah nilai refreshTrigger
        // JANGAN memanggil fetchRegularPosts() langsung
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(response.message || 'Gagal mengubah status featured post');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Terjadi kesalahan saat mengubah status featured post');
    } finally {
      // Tunggu sebentar sebelum menghilangkan state transisi
      // Waktu ini harus lebih lama dari delay di useEffect
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }
  };

  // Tambahkan fungsi helper untuk memastikan data post selalu tersedia
  const ensurePostData = async (postId) => {
    // Cek di regular posts
    let post = regularPosts.find(p => p.id === postId);

    // Cek di featured post
    if (!post && featuredPost?.id === postId) {
      post = featuredPost;
    }

    // Jika masih tidak ditemukan, ambil dari API
    if (!post) {
      try {
        const response = await api.get(`/api/posts/${postId}`);
        if (response.data?.success) {
          post = response.data.data;
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
        throw new Error('Gagal mengambil data post');
      }
    }

    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    return post;
  };

  const getLabelText = useCallback((post) => {
    if (post.labels && Array.isArray(post.labels) && post.labels.length > 0) {
      return post.labels.map(label =>
        label.label ? label.label.toUpperCase() : ''
      ).filter(Boolean).join(', ');
    }
    return '';
  }, []);

  // Modifikasi getImageUrl
  const getImageUrl = useCallback((imagePath, postId) => {
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
      console.error('Error generating image URL:', error);
      return '/default-fallback-image.jpg';
    }
  }, [imageVersions]);

  const handleEdit = useCallback((postId, e) => {
    e.stopPropagation();
    navigate(`/admin/edit-post/${postId}`);
  }, [navigate]);

  const handleImageError = useCallback((postId) => {
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
        console.error('Error deleting post permanently:', error);
        toast.error('Gagal menghapus post secara permanen: ' + (error.message || 'Terjadi kesalahan'));
      } finally {
        setContentLoading(false);
      }
    }
  };

  // Perbaikan fungsi fetchDeletedPosts
  const fetchDeletedPosts = useCallback(async () => {
    try {
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
      console.error('Error fetching deleted posts:', error);
      setError('Gagal memuat data post yang dihapus: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setContentLoading(false);
    }
  }, [currentPage, ITEMS_PER_PAGE]);

// Fungsi handlePostClick untuk menangani klik pada post
const handlePostClick = (postId, e) => {
  // Jika click berasal dari area action buttons, jangan redirect
  if (e.target.closest('.admin-post-actions') ||
      e.target.closest('.post-actions') ||
      e.target.closest('button')) {
    return;
  }
  handleEdit(postId, e);
};

// Modifikasi renderPost dengan menambahkan onClick handler
const renderPost = useCallback((post, isFeatured = false) => {
  if (!post) return null;

  // Pastikan post memiliki status yang valid
  const processedPost = ensurePostStatus(post);
  const labels = getLabelText(processedPost);

  return (
    <div
      className={`admin-post-item ${processedPost.deleted_at ? 'deleted' : ''}`}
      onClick={(e) => handlePostClick(processedPost.id, e)} // Tambahkan onClick handler
    >
      <div className="admin-post-thumbnail">
        <LazyLoadImage
          alt={processedPost.title}
          height={100}
          src={getImageUrl(processedPost.image, processedPost.id)}
          width={150}
          effect="blur"
          key={`${processedPost.id}-${imageVersions[processedPost.id]}`}
          beforeLoad={() => {
            console.log('Loading image:', processedPost.image);
          }}
          afterLoad={() => {
            if (updatedImages.has(processedPost.id)) {
              setUpdatedImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(processedPost.id);
                return newSet;
              });
            }
          }}
          onError={(e) => {
            console.error('Error loading image:', {
              postId: processedPost.id,
              imagePath: processedPost.image,
              error: e
            });
            if (!e.target.src.includes('default-fallback-image.jpg')) {
              e.target.src = '/default-fallback-image.jpg';
            }
          }}
          placeholderSrc="/placeholder-image.jpg"
          wrapperClassName="image-wrapper"
          className="post-image"
        />
        {isFeatured && <div className="admin-featured-label">FEATURED</div>}
      </div>
      <div className="admin-post-content">
        <div className="admin-post-info">
          <h3 className="admin-post-title">{processedPost.title}</h3>
          <div className="admin-post-meta">
            <span>{moment(processedPost.created_at).format('DD/MM/YYYY')}</span>
            {labels && <span className="admin-post-labels">{labels}</span>}
            <div className={getStatusClass(processedPost.status)}>
              {processedPost.status || 'Draft'}
            </div>
          </div>
          <div className="admin-post-stats">
            <span><i className="fas fa-eye"></i> {processedPost.views || 0}</span>
            <span><i className="fas fa-comment"></i> {processedPost.comments_count || 0}</span>
          </div>
        </div>
      </div>
      <div className="admin-post-actions">
        {user && user.role === 'admin' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFeatured(processedPost.id, processedPost.is_featured);
            }}
            className={`admin-featured-toggle ${processedPost.is_featured ? 'featured' : ''}`}
            title={processedPost.is_featured ? 'Hapus dari featured' : 'Jadikan featured'}
          >
            <i className={`fas fa-star ${processedPost.is_featured ? 'featured' : ''}`}></i>
          </button>
        )}
        {user && (
          <>
            {(user.role === 'admin' || processedPost.author_id === user.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(processedPost.id, e);
                }}
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>
      <div className="post-actions">
        {user.role === 'admin' && (
          <>
            {processedPost.deleted_at ? (
              <div className="deleted-post-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(processedPost.id, e);
                  }}
                  className="restore-button"
                  title="Pulihkan post"
                >
                  <i className="fas fa-trash-restore"></i> Pulihkan
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePermanentDelete(processedPost.id, e);
                  }}
                  className="delete-permanent-button"
                  title="Hapus permanen"
                >
                  <i className="fas fa-trash"></i> Hapus Permanen
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoftDelete(processedPost.id, e);
                }}
                className="soft-delete-button"
                title="Hapus sementara"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}, [getImageUrl, getLabelText, imageVersions, updatedImages, user, handleEdit, handleToggleFeatured, handleRestore, handlePermanentDelete, handleSoftDelete]);

  // Update komponen Pagination
  const Pagination = ({ currentPage, totalPages, onPageChange, isTransitioning }) => {
    const renderPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5; // Jumlah maksimal tombol halaman yang ditampilkan

      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Sesuaikan startPage jika endPage sudah mencapai batas
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // Tambahkan tombol First dan Prev
      pages.push(
        <button
          key="first"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isTransitioning}
          className="pagination-button"
        >
          «
        </button>
      );

      pages.push(
        <button
          key="prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isTransitioning}
          className="pagination-button"
        >
          ‹
        </button>
      );

      // Tambahkan ellipsis di awal jika perlu
      if (startPage > 1) {
        pages.push(
          <span key="ellipsis-start" className="pagination-ellipsis">...</span>
        );
      }

      // Tambahkan tombol halaman
      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            disabled={isTransitioning}
            className={`pagination-button ${currentPage === i ? 'active' : ''}`}
          >
            {i}
          </button>
        );
      }

      // Tambahkan ellipsis di akhir jika perlu
      if (endPage < totalPages) {
        pages.push(
          <span key="ellipsis-end" className="pagination-ellipsis">...</span>
        );
      }

      // Tambahkan tombol Next dan Last
      pages.push(
        <button
          key="next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isTransitioning}
          className="pagination-button"
        >
          ›
        </button>
      );

      pages.push(
        <button
          key="last"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isTransitioning}
          className="pagination-button"
        >
          »
        </button>
      );

      return pages;
    };

    return (
      <div className="admin-pagination">
        {renderPageNumbers()}
      </div>
    );
  };

  // Modifikasi handlePageChange untuk mempertahankan version gambar
  const handlePageChange = useCallback(async (newPage) => {
    if (newPage === currentPage || isTransitioning) return;

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
      console.error('Error changing page:', error);
      setError('Gagal mengubah halaman');
    } finally {
      setIsTransitioning(false);
    }
  }, [currentPage, isTransitioning, fetchRegularPosts]);

  useEffect(() => {
    // Reset halaman ke 1 saat filter berubah
    if (!initialLoading) {
      setCurrentPage(1);
      if (isSearching) {
        performAdvancedSearch({
          q: searchInput.trim(),
          page: 1,
          filters: {
            status: filters.status,
            label: filters.label,
            featured: filters.featured,
            sort: sortBy
          }
        });
      } else {
        fetchRegularPosts();
      }
    }
  }, [filters, sortBy]); // Dependensi hanya pada filters dan sortBy

  // Tambahkan useEffect untuk memanggil fungsi yang sesuai berdasarkan activeTab
  useEffect(() => {
    if (!initialLoading) {
      if (activeTab === 'deleted-posts') {
        fetchDeletedPosts();
      } else if (activeTab === 'posts') {
        fetchRegularPosts();
      }
    }
  }, [activeTab, currentPage, fetchRegularPosts, fetchDeletedPosts, initialLoading]);


    // Subscribe ke event storage untuk menangkap perubahan dari tab lain
    const handleStorageChange = (e) => {
      if (e.key === 'lastUpdatedPost') {
        fetchPosts();
      }
    };

  // Modifikasi useEffect untuk mendengarkan perubahan gambar
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'imageUpdated') {
        const updatedData = JSON.parse(e.newValue || '{}');
        if (updatedData.postId) {
          setUpdatedImages(prev => new Set([...prev, updatedData.postId]));
          setImageVersions(prev => ({
            ...prev,
            [updatedData.postId]: Date.now()
          }));
          fetchRegularPosts();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Modifikasi useEffect untuk tab switching
  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      if (!initialLoading && isSubscribed) {
        setContentLoading(true);
        try {
          if (activeTab === 'deleted-posts') {
            await fetchDeletedPosts();
          } else if (activeTab === 'posts') {
            await fetchRegularPosts();
          }
        } finally {
          if (isSubscribed) {
            setContentLoading(false);
          }
        }
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [activeTab, currentPage, fetchRegularPosts, fetchDeletedPosts, initialLoading]);

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
            fetchRegularPosts();
          }
        } catch (error) {
          console.error('Error parsing updated post data:', error);
        }
      }
    };

    checkForUpdates();
  }, [location]);

  // Tambahkan CSS class untuk highlight post yang baru diupdate
  const getPostClassName = (postId) => {
    let className = 'admin-post-item';
    if (lastUpdatedPost === postId) {
      className += ' post-updated';
    }
    return className;
  };

  // Perbaikan fungsi fetchFeaturedPost
  const fetchFeaturedPost = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      console.log('Fetching admin featured post...');

      const response = await getAdminFeaturedPost();
      console.log('Featured response raw:', response);

      // Periksa struktur respons
      if (response.success) {
        // Periksa apakah data ada di response.data atau langsung di response
        const featuredData = response.data;

        if (featuredData) {
          console.log('Featured post data found:', featuredData);

          // Validasi data featured post
          if (featuredData.id && featuredData.title) {
            console.log('Valid featured post, setting state:', featuredData);
            setFeaturedPost(featuredData);
          } else if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].id) {
            console.log('Valid featured post array, setting first item:', featuredData[0]);
            setFeaturedPost(featuredData[0]);
          } else {
            console.log('Featured data structure invalid:', featuredData);
            setFeaturedPost(null);
          }
        } else {
          console.log('No featured post data in response');
          setFeaturedPost(null);
        }
      } else {
        console.log('API response not successful');
        setFeaturedPost(null);
      }
    } catch (error) {
      console.error('Error in fetchFeaturedPost:', error);
      setFeaturedPost(null);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  // Tambahkan useEffect khusus untuk featured post
  useEffect(() => {
    fetchFeaturedPost();
  }, [fetchFeaturedPost]);

  // Gunakan useEffect dengan refreshTrigger sebagai dependency
  useEffect(() => {
    if (!initialLoading) {
      console.log('Fetching posts with refreshTrigger:', refreshTrigger);

      // Tambahkan delay kecil untuk menghindari kedipan
      const timer = setTimeout(() => {
        fetchRegularPosts();
      }, 300);

      // Cleanup function untuk mencegah race condition
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger, initialLoading, fetchRegularPosts]);


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
    <div className={`admin-posts-container ${isTransitioning ? 'transitioning' : ''}`}>
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <nav className="admin-nav">
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
                  className={`admin-nav-button ${activeTab === 'writers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('writers')}
                >
                  Penulis Pending
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
                        <form onSubmit={handleSearchSubmit} className="search-form">
                          <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchInputChange}
                            placeholder="Cari postingan..."
                            className="search-input"
                            minLength={3} // Minimal 3 karakter
                          />
                          <button
                            type="submit"
                            className="search-button"
                            disabled={searchInput.trim().length < 3} // Disable jika kurang dari 3 karakter
                          >
                            Cari
                          </button>
                        </form>

                        <div className="filter-controls">
                          <NestedDropdown
                            labels={labels}
                            onFilterChange={handleFilterChange}
                            currentFilters={{
                              status: filters.status,
                              label: filters.label,
                              featured: filters.featured,
                              sort: sortBy
                            }}
                            isLoading={dropdownLoading}
                          />
                        </div>

                        <Link to="/admin/add-post" className="admin-new-post-button">
                          Buat Postingan Baru
                        </Link>
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
                              {console.log('Rendering featured post:', featuredPost)}
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
                    <div className="regular-posts-section">
                      <h3>Regular Posts</h3>
                      {regularPosts.length > 0 ? (
                        regularPosts.map(post => renderPost(post))
                      ) : (
                        <div className="no-posts">Tidak ada postingan yang tersedia</div>
                      )}
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

              {/* Writers Tab */}
              {activeTab === 'writers' && user?.role === 'admin' && (
                <div className="admin-pending-writers">
                  <div className="admin-posts-header">
                    <div className="admin-title-section">
                      <div className="admin-posts-header-title">
                        <h2 className="admin-posts-title">Penulis Pending</h2>
                        <div className="admin-posts-counter">{pendingWriters.length}</div>
                      </div>
                    </div>
                    <div className="admin-posts-actions">
                      <button
                        className="refresh-button"
                        onClick={fetchPendingWriters}
                        disabled={loading}
                      >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {pendingWritersError ? (
                    <div className="error-message">{pendingWritersError}</div>
                  ) : pendingWriters.length === 0 ? (
                    <div className="empty-state">
                      <FiUsers size={48} />
                      <p>Tidak ada penulis yang menunggu persetujuan</p>
                    </div>
                  ) : (
                    <div className="pending-writers-list">
                      <table className="writers-table">
                        <thead>
                          <tr>
                            <th>Nama</th>
                            <th>Email</th>
                            <th>Tanggal Daftar</th>
                            <th>Status</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingWriters.map(writer => (
                            <tr key={writer.id}>
                              <td>{writer.name || writer.username || 'Tidak ada nama'}</td>
                              <td>{writer.email}</td>
                              <td>{new Date(writer.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}</td>
                              <td>
                                {!writer.is_verified ? (
                                  <span className="status-badge not-verified">Belum Diverifikasi</span>
                                ) : !writer.is_approved ? (
                                  <span className="status-badge not-approved">Belum Disetujui</span>
                                ) : (
                                  <span className="status-badge approved">Disetujui</span>
                                )}
                              </td>
                              <td>
                                <div className="writer-actions">
                                  {!writer.is_verified && (
                                    <button
                                      className="verify-button"
                                      onClick={() => handleVerifyWriter(writer.id)}
                                      disabled={processingWriters[writer.id] === 'verifying'}
                                    >
                                      {processingWriters[writer.id] === 'verifying' ? (
                                        <span>Memverifikasi...</span>
                                      ) : (
                                        <>
                                          <FiCheckCircle />
                                          <span>Verifikasi</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {writer.is_verified && !writer.is_approved && (
                                    <button
                                      className="approve-button"
                                      onClick={() => handleApproveWriter(writer.id)}
                                      disabled={processingWriters[writer.id] === 'approving'}
                                    >
                                      {processingWriters[writer.id] === 'approving' ? (
                                        <span>Menyetujui...</span>
                                      ) : (
                                        <>
                                          <FiThumbsUp />
                                          <span>Setujui</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    className="reject-button"
                                    onClick={() => handleRejectWriter(writer.id)}
                                    disabled={processingWriters[writer.id] === 'rejecting'}
                                  >
                                    {processingWriters[writer.id] === 'rejecting' ? (
                                      <span>Menolak...</span>
                                    ) : (
                                      <>
                                        <FiThumbsDown />
                                        <span>Tolak</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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

              {activeTab === 'deleted-posts' && (
                <div className="admin-posts">
                  <div className="admin-posts-header">
                    <h2 className="admin-posts-title">Post Terhapus</h2>
                    <span className="posts-count">({totalCount} post)</span>
                  </div>

                  {contentLoading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Memuat data post terhapus...</p>
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
