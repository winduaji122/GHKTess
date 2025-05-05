import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PostCardLabel from './PostCardLabel';
import LabelSearchBar from './LabelSearchBar';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Pagination from './Pagination';
import './LabelPostsPage.css';
import './Pagination.css';
import { getPostsByLabel, getAllLabels } from '../api/labelApi';
import { Helmet } from 'react-helmet-async';

const LabelPostsPage = () => {
  const { labelSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentPage = parseInt(queryParams.get('page') || '1', 10);

  const [posts, setPosts] = useState([]);
  const [label, setLabel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: currentPage,
    totalPages: 1,
    totalItems: 0
  });

  // Fungsi untuk memproses hasil fetch
  const processPostsResult = useCallback((result) => {
    if (result.success) {
      setPosts(result.posts);
      setLabel(result.label || { label: 'Semua Artikel' });
      setFilteredPosts(result.posts);
      setPagination({
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems
      });
      return true;
    } else {
      setError(result.error || 'Gagal memuat artikel. Silakan coba lagi nanti.');
      return false;
    }
  }, []);

  // Fetch posts by label
  useEffect(() => {
    let isMounted = true;

    const fetchPostsByLabel = async () => {
      setLoading(true);
      try {
        // Jika labelSlug adalah '404' atau 'not-found', redirect ke halaman 404
        if (labelSlug === '404' || labelSlug === 'not-found') {
          navigate('/not-found', { replace: true });
          return;
        }

        // Tentukan parameter fetch
        const targetLabel = labelSlug === 'posts' ? 'all' : labelSlug;

        // Fetch posts dengan cache busting
        const timestamp = Date.now();
        const result = await getPostsByLabel(targetLabel, currentPage, 12, { _t: timestamp });

        if (!isMounted) return;

        processPostsResult(result);
      } catch (err) {
        if (isMounted) {
          setError('Gagal memuat artikel. Silakan coba lagi nanti.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Jika tidak ada labelSlug, ambil semua post terbaru
    if (!labelSlug) {
      const fetchAllPosts = async () => {
        setLoading(true);
        try {
          const result = await getPostsByLabel('all', currentPage, 12);

          if (!isMounted) return;

          processPostsResult(result);
        } catch (err) {
          if (isMounted) {
            setError('Gagal memuat artikel. Silakan coba lagi nanti.');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      fetchAllPosts();
    } else {
      fetchPostsByLabel();
    }

    return () => {
      isMounted = false;
    };
  }, [labelSlug, currentPage, navigate, processPostsResult]);

  // Fetch all labels for the navbar
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const allLabels = await getAllLabels();

        // Grup label berdasarkan kategori (jika ada)
        const groupedLabels = [];
        const mainLabels = new Map();

        // Pertama, identifikasi label utama
        allLabels.forEach(label => {
          // Jika label memiliki parent_id, maka itu adalah sublabel
          if (!label.parent_id) {
            mainLabels.set(label.id, {
              ...label,
              sublabels: []
            });
            groupedLabels.push({
              ...label,
              sublabels: []
            });
          }
        });

        // Kemudian, tambahkan sublabel ke label utama
        allLabels.forEach(label => {
          if (label.parent_id && mainLabels.has(label.parent_id)) {
            const mainLabel = mainLabels.get(label.parent_id);
            mainLabel.sublabels.push(label);
          }
        });

        setLabels(groupedLabels);
      } catch (err) {
        console.error('Error fetching labels:', err);
      }
    };

    fetchLabels();
  }, []);

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [searchTerm, posts]);

  // Fungsi ini tidak lagi digunakan karena LabelNavbar telah dihapus
  // const handleLabelClick = (slug) => {
  //   navigate(`/label/${slug}`);
  // };

  const handlePageChange = (page) => {
    // Scroll ke atas halaman
    window.scrollTo(0, 0);

    // Navigasi ke halaman yang dipilih dengan mempertahankan labelSlug
    if (labelSlug) {
      navigate(`/label/${labelSlug}?page=${page}`);
    } else {
      navigate(`/posts?page=${page}`);
    }
  };

  // Memoize skeleton loader untuk mencegah re-render yang tidak perlu
  const SkeletonLoader = useMemo(() => (
    <div className="label-posts-container">
      <div className="label-posts-header">
        <Skeleton height={40} width={200} className="mb-4" />
      </div>

      {/* Featured Post Skeleton */}
      <div className="featured-post-skeleton">
        <Skeleton height={400} width="100%" className="mb-3" />
        <Skeleton height={32} width="80%" className="mb-3" />
        <Skeleton height={20} width="60%" className="mb-2" />
        <Skeleton height={20} width="40%" className="mb-2" />
      </div>

      <div className="posts-grid">
        {Array(6).fill(0).map((_, index) => (
          <div key={index} className="post-card-skeleton">
            <Skeleton height={200} width="100%" className="mb-2" />
            <Skeleton height={24} width="80%" className="mb-2" />
            <Skeleton height={16} width="60%" />
          </div>
        ))}
      </div>
    </div>
  ), []);

  if (loading) {
    return SkeletonLoader;
  }

  if (error) {
    return (
      <div className="label-posts-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Coba Lagi</button>
      </div>
    );
  }

  // SEO title and description
  const seoTitle = label ? `${label.label} - Artikel Terbaru` : 'Semua Artikel Terbaru';
  const seoDescription = label ? label.description : 'Kumpulan artikel terbaru dari berbagai kategori';

  // Separate featured post (first/latest post) from the rest
  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const remainingPosts = filteredPosts.length > 0 ? filteredPosts.slice(1) : [];

  return (
    <div className="label-posts-container">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        {featuredPost && featuredPost.image && (
          <meta property="og:image" content={featuredPost.image} />
        )}
      </Helmet>

      <div className="label-posts-header">
        <h1 className="label-posts-title">
          {label ? label.label : 'Semua Artikel'}
        </h1>
        <p className="label-posts-description">
          {label ? label.description : 'Kumpulan artikel terbaru dari berbagai kategori'}
        </p>
      </div>

      <div className="search-section">
        <LabelSearchBar
          searchTerm={searchTerm}
          selectedLabel={labelSlug}
          labels={labels}
          onSearch={(term, label) => {
            setSearchTerm(term);
            if (label && label !== labelSlug) {
              navigate(`/label/${label}`);
            }
          }}
        />
      </div>

      {filteredPosts.length === 0 ? (
        <div className="no-posts-found">
          <p>Tidak ada artikel yang ditemukan.</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search-btn">
              Hapus Pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Featured Post (Main Post) */}
          {featuredPost && (
            <div className="featured-post-container">
              <PostCardLabel
                key={featuredPost.id}
                post={featuredPost}
                isFeatured={true}
              />
            </div>
          )}

          {/* Section Title for Remaining Posts */}
          {remainingPosts.length > 0 && (
            <div className="section-title">
              <h2>Artikel Lainnya</h2>
            </div>
          )}

          {/* Grid for Remaining Posts */}
          <div className="posts-grid">
            {remainingPosts.map(post => (
              <PostCardLabel
                key={post.id}
                post={post}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />

          {/* Informasi jumlah artikel */}
          <div className="posts-count">
            Menampilkan {filteredPosts.length} dari {pagination.totalItems} artikel
          </div>
        </>
      )}
    </div>
  );
};

// Memoize komponen untuk mencegah render ulang yang tidak perlu
export default memo(LabelPostsPage);
