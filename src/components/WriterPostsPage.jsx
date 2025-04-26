/*  */import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaEdit, FaTrash, FaSearch, FaEye, FaPlus, FaCalendarAlt, FaUndo, FaFilter, FaTimes } from 'react-icons/fa';
import PostStats from './PostStats';
import LazyImage from './common/LazyImage';
import '../styles/lazyImage.css';
import { toast } from 'react-toastify';
import { getMyPosts, restorePost, getMyDeletedPosts, softDeletePost } from '../api/postApi';
import { getLabels } from '../api/labelApi';
import { useAuth } from '../contexts/AuthContext';
import './WriterPosts.css';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { getImageUrl } from '../utils/imageHelper';
import '../styles/custom-dialog.css';

const WriterPostsPage = () => {
  const navigate = useNavigate();
  const { refreshAuthState, logout } = useAuth();
  const [regularPosts, setRegularPosts] = useState([]);
  const [deletedPosts, setDeletedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [postsPerPage] = useState(10);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [contentLoading, setContentLoading] = useState(false);
  const [imageVersions, setImageVersions] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [labels, setLabels] = useState([]);

  // Tambahkan fungsi debugging ini di dalam komponen WriterPostsPage
  const debugPostImage = (post) => {
    console.group(`Debug Post Image (ID: ${post.id})`);
    console.log('Post object:', post);
    console.log('featured_image:', post.featured_image);

    // Cek semua kemungkinan properti gambar
    const possibleImageProps = ['featured_image', 'image', 'thumbnail', 'featured_img', 'cover_image'];
    possibleImageProps.forEach(prop => {
      if (post[prop]) {
        console.log(`Found image in property "${prop}":`, post[prop]);
      }
    });

    // Coba semua kemungkinan cara mendapatkan URL gambar
    try {
      if (post.featured_image) {
        if (typeof post.featured_image === 'object') {
          console.log('featured_image is object:', post.featured_image);
          if (post.featured_image.path) {
            console.log('Path found:', post.featured_image.path);
            console.log('URL from path:', getImageUrl(post.featured_image.path));
          }
          if (post.featured_image.url) {
            console.log('URL found:', post.featured_image.url);
          }
        } else if (typeof post.featured_image === 'string') {
          console.log('featured_image is string:', post.featured_image);
          console.log('URL from string:', getImageUrl(post.featured_image));
        }
      }
    } catch (error) {
      console.error('Error in image debugging:', error);
    }

    console.groupEnd();
  };

  // Debugging untuk melihat struktur post (hanya dijalankan sekali)
  useEffect(() => {
    const debugPostStructure = async () => {
      try {
        console.log('Debugging post structure...');
        const response = await getMyPosts({ limit: 1 });

        if (response && response.success && response.posts && response.posts.length > 0) {
          const samplePost = response.posts[0];
          console.log('Sample post structure:', samplePost);
          console.log('Post properties:', Object.keys(samplePost));

          // Periksa properti label
          console.log('Post has labels property:', 'labels' in samplePost);
          console.log('Post has tags property:', 'tags' in samplePost);

          // Cek properti lain yang mungkin berisi label
          const possibleLabelProps = ['labels', 'tags', 'categories', 'topics'];
          possibleLabelProps.forEach(prop => {
            if (prop in samplePost) {
              console.log(`Found ${prop}:`, samplePost[prop]);
            }
          });
        }
      } catch (err) {
        console.error('Error in debug function:', err);
      }
    };

    // Jalankan debugging hanya sekali saat komponen dimount
    debugPostStructure();
  }, []);

  // Tambahkan fungsi untuk debugging labels
  useEffect(() => {
    if (regularPosts.length > 0) {
      console.log('Checking labels in posts:');
      regularPosts.forEach(post => {
        console.log(`Post "${post.title}" labels:`, post.labels);

        // Cek properti lain yang mungkin berisi label
        const possibleLabelProps = ['tags', 'categories', 'topics'];
        possibleLabelProps.forEach(prop => {
          if (post[prop]) {
            console.log(`Post "${post.title}" ${prop}:`, post[prop]);
          }
        });
      });
    }
  }, [regularPosts, deletedPosts, activeTab]);

  // Fetch regular posts
  const fetchRegularPosts = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      console.log('Fetching regular posts...');
      const {
        page = currentPage,
        search = searchTerm,
        dateFrom = filterDateFrom,
        dateTo = filterDateTo,
        labelId = filterLabel
      } = options;

      console.log('Fetching with filters:', { page, search, dateFrom, dateTo, labelId });

      const response = await getMyPosts({
        page,
        limit: postsPerPage,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        labelId: labelId || undefined
      });

      console.log('Regular posts response:', response);
      setRegularPosts(response.posts || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (error.response?.status === 401) {
        try {
          await refreshAuthState();
          // Retry after refreshing auth
          const response = await getMyPosts({
            page: currentPage,
            limit: postsPerPage,
            search: searchTerm,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
            labelId: filterLabel || undefined
          });
          setRegularPosts(response.posts || []);
          setTotalPages(response.pagination?.totalPages || 1);
        } catch (refreshError) {
          console.error('Error refreshing auth:', refreshError);
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          navigate('/login');
        }
      } else {
        toast.error('Gagal mengambil data post. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, postsPerPage, refreshAuthState, navigate]);

  // Fetch deleted posts
  const fetchDeletedPosts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching deleted posts...');
      const response = await getMyDeletedPosts({
        page: currentPage,
        limit: postsPerPage,
        search: searchTerm,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined
      });

      console.log('Deleted posts response:', response);
      setDeletedPosts(response.posts || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching deleted posts:', error);
      if (error.response?.status === 401) {
        try {
          await refreshAuthState();
          // Retry after refreshing auth
          const response = await getMyDeletedPosts({
            page: currentPage,
            limit: postsPerPage,
            search: searchTerm
          });
          setDeletedPosts(response.posts || []);
          setTotalPages(response.pagination?.totalPages || 1);
        } catch (refreshError) {
          console.error('Error refreshing auth:', refreshError);
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          navigate('/login');
        }
      } else {
        toast.error('Gagal mengambil data post terhapus. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, postsPerPage, searchTerm, filterDateFrom, filterDateTo, refreshAuthState, navigate]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    try {
      const labelsData = await getLabels();
      setLabels(labelsData);
    } catch (error) {
      console.error('Error fetching labels:', error);
      toast.error('Gagal mengambil data label');
    }
  }, []);

  // Effect for initial load and tab switching
  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      if (isSubscribed) {
        setContentLoading(true);
        try {
          console.log(`Loading data for tab: ${activeTab}`);
          // Fetch labels first
          await fetchLabels();

          if (activeTab === 'deleted-posts') {
            await fetchDeletedPosts();
          } else if (activeTab === 'posts') {
            await fetchRegularPosts({
              page: currentPage,
              search: searchTerm,
              dateFrom: filterDateFrom,
              dateTo: filterDateTo,
              labelId: filterLabel
            });
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
  }, [activeTab, fetchLabels]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    console.log(`Searching for: ${searchTerm} in tab: ${activeTab}`);
    console.log(`Filters: dateFrom=${filterDateFrom}, dateTo=${filterDateTo}, label=${filterLabel}`);
    setCurrentPage(1);
    if (activeTab === 'deleted-posts') {
      fetchDeletedPosts();
    } else {
      fetchRegularPosts({
        page: 1,
        search: searchTerm,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        labelId: filterLabel
      });
    }
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterLabel('');
    setCurrentPage(1);

    // Fetch posts with reset filters
    if (activeTab === 'deleted-posts') {
      fetchDeletedPosts();
    } else {
      fetchRegularPosts({
        page: 1,
        search: '',
        dateFrom: '',
        dateTo: '',
        labelId: ''
      });
    }
  };



  // Handle pagination
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (activeTab === 'deleted-posts') {
      fetchDeletedPosts();
    } else {
      fetchRegularPosts({
        page: pageNumber,
        search: searchTerm,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        labelId: filterLabel
      });
    }
  };

  // Handle edit post
  const handleEditPost = (postId) => {
    navigate(`/writer/edit-post/${postId}`);
  };

  // Handle view post
  const handleViewPost = (post) => {
    window.open(`/post/${post.slug || post.id}`, '_blank');
  };

  // Handle delete confirmation
  const handleDeleteClick = async (post) => {
    // Gunakan window.confirm untuk konfirmasi
    if (!window.confirm(`Apakah Anda yakin ingin menghapus post "${post.title}"?`)) {
      return;
    }

    try {
      setContentLoading(true);

      // Panggil API untuk soft delete
      const response = await softDeletePost(post.id);

      if (response.success) {
        // Hapus post dari daftar
        setRegularPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));

        // Post has been removed

        // Tampilkan notifikasi sukses
        toast.success('Post berhasil dihapus');

        // Muat ulang data jika diperlukan
        if (regularPosts.length <= 1 && currentPage > 1) {
          // Jika ini adalah post terakhir di halaman, kembali ke halaman sebelumnya
          setCurrentPage(prev => prev - 1);
        } else {
          // Jika masih ada post lain, refresh halaman saat ini
          fetchRegularPosts();
        }
      } else {
        toast.error(response.message || 'Gagal menghapus post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);

      if (error.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
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

  // Handle restore post
  const handleRestorePost = async (postId) => {
    try {
      setContentLoading(true);
      const response = await restorePost(postId);

      if (response.success) {
        // Hapus post dari daftar post terhapus
        setDeletedPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
        toast.success('Post berhasil dipulihkan');

        // Refresh data post terhapus
        fetchDeletedPosts();
      } else {
        toast.error(response.message || 'Gagal memulihkan post');
      }
    } catch (error) {
      console.error('Error restoring post:', error);
      toast.error('Gagal memulihkan post. Silakan coba lagi.');
    } finally {
      setContentLoading(false);
    }
  };

  // Handle add new post
  const handleAddPost = () => {
    navigate('/writer/add-post');
  };

  // Fungsi untuk memformat tanggal dengan lebih baik
  const formatDate = (dateString) => {
    if (!dateString) return '-';

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk render status badge
  const renderStatusBadge = (status) => {
    let badgeClass = 'writer-status-badge';
    let statusText = '';

    switch (status) {
      case 'published':
        badgeClass += ' writer-status-published';
        statusText = 'Dipublikasikan';
        break;
      case 'draft':
        badgeClass += ' writer-status-draft';
        statusText = 'Draft';
        break;
      case 'scheduled':
        badgeClass += ' writer-status-scheduled';
        statusText = 'Terjadwal';
        break;
      case 'archived':
        badgeClass += ' writer-status-archived';
        statusText = 'Diarsipkan';
        break;
      default:
        statusText = status || 'Unknown';
        break;
    }

    return <span className={badgeClass}>{statusText}</span>;
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination-container">
        <div className="pagination">
          <Button
            variant="outline-primary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &laquo;
          </Button>

          {pageNumbers.map(number => (
            <Button
              key={number}
              variant={number === currentPage ? 'primary' : 'outline-primary'}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </Button>
          ))}

          <Button
            variant="outline-primary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &raquo;
          </Button>
        </div>
        <div className="pagination-info">
          Halaman {currentPage} dari {totalPages}
        </div>
      </div>
    );
  };

  // Modifikasi fungsi getPostImageUrl
  const getPostImageUrl = (post) => {
    if (!post) {
      console.error('Post is undefined');
      return '/placeholder-image.jpg';
    }

    // Debug post object
    debugPostImage(post);

    // Cek semua kemungkinan properti gambar
    const imageField = post.featured_image || post.image || post.thumbnail || post.featured_img || post.cover_image;

    if (!imageField) {
      console.log(`No image field found for post ${post.id}`);
      return '/placeholder-image.jpg';
    }

    try {
      // Jika imageField adalah object dengan path
      if (typeof imageField === 'object') {
        if (imageField.path) {
          const url = getImageUrl(imageField.path);
          console.log(`Generated URL from object.path: ${url}`);
          return url;
        }
        if (imageField.url) {
          console.log(`Using direct URL from object.url: ${imageField.url}`);
          return imageField.url;
        }
      }

      // Jika imageField adalah string (path langsung)
      if (typeof imageField === 'string') {
        // Cek jika sudah URL lengkap
        if (imageField.startsWith('http')) {
          console.log(`Using direct URL: ${imageField}`);
          return imageField;
        }

        // Tambahkan version untuk mencegah cache
        const version = imageVersions[post.id] || Date.now();
        const imageUrl = getImageUrl(imageField);
        console.log(`Generated URL from string: ${imageUrl}?v=${version}`);
        return `${imageUrl}?v=${version}`;
      }

      console.log(`Falling back to placeholder for post ${post.id}`);
      return '/placeholder-image.jpg';
    } catch (error) {
      console.error('Error getting image URL:', error);
      return '/placeholder-image.jpg';
    }
  };

  // Tambahkan log untuk melihat implementasi getImageUrl
  console.log('getImageUrl implementation:', getImageUrl.toString());

  // Fungsi untuk menangani error gambar
  const handleImageError = (postId) => {
    console.log(`Image error for post ${postId}`);
    // Update versi gambar untuk mencoba lagi
    setImageVersions(prev => ({
      ...prev,
      [postId]: Date.now()
    }));
  };

  // Perbaiki fungsi getLabelText untuk menangani format label yang benar
  const getLabelText = (post) => {
    // Jika post tidak memiliki properti labels, coba cek properti lain
    if (!post) return '';

    // Debug untuk melihat struktur post
    console.log('Getting labels for post:', post);

    // Cek apakah labels ada sebagai properti langsung
    if (post.labels) {
      console.log('Found labels property:', post.labels);

      // Jika labels adalah array
      if (Array.isArray(post.labels)) {
        if (post.labels.length === 0) {
          console.log('Labels array is empty');
          return '';
        }

        // Jika array berisi objek dengan properti label (format baru dari backend)
        if (typeof post.labels[0] === 'object' && post.labels[0].label) {
          console.log('Labels are objects with label property');
          return post.labels.map(label => label.label).join(', ');
        }

        // Jika array berisi objek dengan properti name (format lama)
        if (typeof post.labels[0] === 'object' && post.labels[0].name) {
          console.log('Labels are objects with name property');
          return post.labels.map(label => label.name).join(', ');
        }

        // Jika array berisi string
        if (typeof post.labels[0] === 'string') {
          console.log('Labels are strings in array');
          return post.labels.join(', ');
        }

        // Jika array berisi objek tanpa properti yang dikenali
        console.log('Labels are objects with unknown structure');
        return post.labels.map(label => {
          // Coba ekstrak nilai yang mungkin berisi teks label
          if (label.label) return label.label;
          if (label.name) return label.name;
          if (label.text) return label.text;
          if (label.value) return label.value;

          // Jika tidak ada properti yang cocok, konversi ke string
          return JSON.stringify(label);
        }).join(', ');
      }

      // Jika labels adalah string
      if (typeof post.labels === 'string') {
        console.log('Labels is a string');
        return post.labels;
      }

      // Jika labels adalah objek
      if (typeof post.labels === 'object' && post.labels !== null) {
        console.log('Labels is an object');
        // Coba ekstrak nilai dari objek
        if (post.labels.label) return post.labels.label;
        if (post.labels.name) return post.labels.name;
        if (post.labels.text) return post.labels.text;
        if (post.labels.value) return post.labels.value;

        // Jika tidak ada properti yang cocok, coba konversi ke string
        return JSON.stringify(post.labels);
      }
    }

    // Cek properti alternatif
    const alternativeProps = ['tags', 'categories', 'topics'];
    for (const prop of alternativeProps) {
      if (post[prop]) {
        console.log(`Found ${prop} property:`, post[prop]);

        if (Array.isArray(post[prop])) {
          if (post[prop].length === 0) continue;

          if (typeof post[prop][0] === 'object' && post[prop][0].name) {
            return post[prop].map(item => item.name).join(', ');
          }

          return post[prop].join(', ');
        }

        if (typeof post[prop] === 'string') {
          return post[prop];
        }
      }
    }

    // Jika tidak ada label yang ditemukan
    console.log('No labels found for post');
    return '';
  };

  // Modifikasi renderPostItem untuk menggunakan getLabelText
  const renderPostItem = (post) => {
    const imageUrl = getPostImageUrl(post);
    const labelText = getLabelText(post);

    return (
      <div
        key={post.id}
        className={`writer-post-item ${activeTab === 'deleted-posts' ? 'deleted' : ''}`}
      >
        <div className="writer-post-thumbnail">
          <LazyImage
            src={imageUrl}
            alt={post.title}
            className="writer-post-image"
            height="140px"
            width="180px"
            objectFit="cover"
            onError={() => handleImageError(post.id)}
          />
        </div>
        <div className="writer-post-content">
          <div className="writer-post-info">
            <h3 className="writer-post-title">
              {post.title}
            </h3>
            <div className="writer-post-meta">
              {renderStatusBadge(post.status)}

              {post.category && (
                <span className="writer-post-category">
                  {post.category}
                </span>
              )}

              {/* Tampilkan label menggunakan getLabelText */}
              {labelText && (
                <div className="writer-post-labels">
                  {labelText.split(', ').map((label, index) => (
                    <span key={index} className="writer-post-label">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="writer-post-stats-container">
              <PostStats
                postId={post.id}
                compact={true}
                viewCount={post.views || post.view_count || 0}
                commentCount={post.comments_count || 0}
                likeCount={post.likes_count || 0}
                className="writer-post-stats"
              />

              <span className="writer-post-created">
                <FaCalendarAlt /> {formatDate(post.created_at)}
              </span>
            </div>
          </div>
          <div className="writer-post-actions">
            {activeTab === 'posts' ? (
              <>
                <button
                  className="writer-action-button writer-view-button"
                  onClick={() => handleViewPost(post)}
                  disabled={post.status !== 'published'}
                  title={post.status !== 'published' ? 'Post belum dipublikasikan' : 'Lihat post'}
                >
                  <FaEye /> <span>Lihat</span>
                </button>
                <button
                  className="writer-action-button writer-edit-button"
                  onClick={() => handleEditPost(post.id)}
                >
                  <FaEdit /> <span>Edit</span>
                </button>
                <button
                  className="writer-action-button writer-delete-button"
                  onClick={() => handleDeleteClick(post)}
                  disabled={post.status !== 'draft'}
                  title={post.status !== 'draft' ? 'Hanya post draft yang dapat dihapus' : 'Hapus post'}
                >
                  <FaTrash /> <span>Hapus</span>
                </button>
              </>
            ) : (
              <button
                className="writer-action-button writer-restore-button"
                onClick={() => handleRestorePost(post.id)}
              >
                <FaUndo /> <span>Pulihkan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Tambahkan useEffect untuk debugging post dan labels
  useEffect(() => {
    const postsToCheck = activeTab === 'deleted-posts' ? deletedPosts : regularPosts;

    if (postsToCheck.length > 0) {
      console.log(`All ${activeTab} posts:`, postsToCheck);

      // Ambil post pertama sebagai contoh
      const samplePost = postsToCheck[0];
      console.log('Sample post:', samplePost);

      // Cek semua properti post
      console.log('Post properties:', Object.keys(samplePost));

      // Cek apakah ada properti yang berisi kata "label" atau "tag"
      const labelRelatedProps = Object.keys(samplePost).filter(key =>
        key.toLowerCase().includes('label') ||
        key.toLowerCase().includes('tag') ||
        key.toLowerCase().includes('categor')
      );

      if (labelRelatedProps.length > 0) {
        console.log('Label-related properties found:', labelRelatedProps);
        labelRelatedProps.forEach(prop => {
          console.log(`${prop}:`, samplePost[prop]);
        });
      } else {
        console.log('No label-related properties found');
      }

      // Coba getLabelText
      const labelText = getLabelText(samplePost);
      console.log('Label text from getLabelText:', labelText);
    }
  }, [activeTab, regularPosts, deletedPosts]);



  // Reset state saat tab berubah
  useEffect(() => {
    // Reset state pagination dan filter saat tab berubah
    setCurrentPage(1);
    setSearchTerm('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterLabel('');
    console.log(`Tab changed to: ${activeTab}`);
  }, [activeTab]);

  return (
    <div className="writer-posts-container">
      <nav className="writer-nav">
        <Link
          to="/dashboard"
          className="writer-nav-button"
        >
          Dashboard
        </Link>
        <button
          className={`writer-nav-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Postingan
        </button>
        <button
          className={`writer-nav-button ${activeTab === 'deleted-posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('deleted-posts')}
        >
          Post Terhapus
        </button>
      </nav>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Memuat data...</p>
        </div>
      ) : (
        <div className="writer-posts">
          <div className="writer-posts-header">
            <div className="writer-title-wrapper">
              <h2 className="writer-posts-title">
                {activeTab === 'posts' ? 'Kelola Post Saya' : 'Post Terhapus'}
              </h2>
              <span className="posts-count">({activeTab === 'deleted-posts' ? deletedPosts.length : regularPosts.length} post)</span>
            </div>

            {activeTab === 'posts' && (
              <Button variant="primary" className="writer-new-post-button" onClick={handleAddPost}>
                <FaPlus /> <span>Buat Post Baru</span>
              </Button>
            )}
          </div>

          <div className="writer-search-form mb-4">
            <Form onSubmit={handleSearch}>
              <div className="writer-search-container">
                <div className="writer-search-row">
                  <div className="writer-search-input-wrapper">
                    <Button variant="link" className="writer-search-icon-btn">
                      <FaSearch />
                    </Button>
                    <Form.Control
                      className="writer-search-input"
                      placeholder="Cari judul post..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        // Jika pengguna menekan Enter, submit form
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch(e);
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant={showFilters ? "primary" : "outline-secondary"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="writer-filter-btn"
                    type="button"
                  >
                    <FaFilter /> <span>{showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}</span>
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="writer-search-filters">
                  <div className="writer-filter-row">
                    <div className="writer-filter-group">
                      <label className="writer-filter-label">Dari Tanggal</label>
                      <Form.Control
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="writer-date-filter"
                      />
                    </div>

                    <div className="writer-filter-group">
                      <label className="writer-filter-label">Sampai Tanggal</label>
                      <Form.Control
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="writer-date-filter"
                      />
                    </div>
                  </div>

                  {activeTab === 'posts' && (
                    <div className="writer-filter-row">
                      <div className="writer-filter-group">
                        <label className="writer-filter-label">Label</label>
                        <Form.Select
                          value={filterLabel || ''}
                          onChange={(e) => setFilterLabel(e.target.value)}
                          className="writer-label-filter"
                        >
                          <option value="">Semua Label</option>
                          {labels.map(label => (
                            <option key={label.id} value={label.id}>{label.name}</option>
                          ))}
                        </Form.Select>
                      </div>
                    </div>
                  )}

                  <div className="writer-filter-actions">
                    <Button type="submit" className="writer-search-button">
                      <FaSearch /> <span>Terapkan Filter</span>
                    </Button>

                    <Button
                      type="button"
                      className="writer-reset-button"
                      onClick={handleResetFilters}
                    >
                      <FaTimes /> <span>Reset Filter</span>
                    </Button>
                  </div>
                </div>
              )}
            </Form>
          </div>

          {contentLoading ? (
            <div className="writer-posts-skeleton my-5">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="writer-post-item-skeleton d-flex mb-3">
                  <div className="writer-post-thumbnail-skeleton me-3">
                    <Skeleton height={140} width={180} />
                  </div>
                  <div className="writer-post-content-skeleton flex-grow-1">
                    <Skeleton height={24} width="80%" className="mb-2" />
                    <Skeleton height={16} width="60%" className="mb-2" />
                    <Skeleton height={16} width="40%" />
                  </div>
                </div>
              ))}
            </div>
          ) : (activeTab === 'deleted-posts' ? deletedPosts.length === 0 : regularPosts.length === 0) ? (
            <div className="empty-state my-5">
              <div className="empty-icon">
                {activeTab === 'deleted-posts' ? '🗑️' : '📝'}
              </div>
              <h3>
                {activeTab === 'deleted-posts'
                  ? 'Tidak Ada Post Terhapus'
                  : 'Belum Ada Post'}
              </h3>
              <p>
                {activeTab === 'deleted-posts'
                  ? 'Post yang Anda hapus akan muncul di sini'
                  : 'Anda belum memiliki post. Mulai menulis sekarang!'}
              </p>
              {activeTab === 'posts' && (
                <Button variant="primary" onClick={handleAddPost} className="mt-3 writer-new-post-button">
                  <FaPlus /> <span>Buat Post Pertama Anda</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="writer-posts-list">
                {activeTab === 'deleted-posts'
                  ? deletedPosts.map(post => renderPostItem(post))
                  : regularPosts.map(post => renderPostItem(post))
                }
              </div>

              {renderPagination()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WriterPostsPage;