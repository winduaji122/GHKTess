import React, { useState, useEffect, useCallback } from 'react';
import { getSpotlightPosts } from '../api/postApi';
import PostCard from './PostCard';
import SpotlightSearchBar from './SpotlightSearchBar';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './SpotlightPage.css';
import { FaLightbulb } from 'react-icons/fa';

const SpotlightPage = () => {
  const [spotlightPosts, setSpotlightPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter posts berdasarkan search term
  const filterPosts = useCallback((posts, term) => {
    if (!term) return posts;

    return posts.filter(post => {
      const title = post.title?.toLowerCase() || '';
      const content = post.content?.toLowerCase() || '';
      const excerpt = post.excerpt?.toLowerCase() || '';
      const searchLower = term.toLowerCase();

      return title.includes(searchLower) ||
             content.includes(searchLower) ||
             excerpt.includes(searchLower);
    });
  }, []);

  // Handle search
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setFilteredPosts(filterPosts(spotlightPosts, term));
  }, [spotlightPosts, filterPosts]);

  useEffect(() => {
    const loadSpotlightPosts = async () => {
      try {
        const response = await getSpotlightPosts();
        console.log('Spotlight posts data:', response);

        if (!response.success) {
          throw new Error(response.message || 'Gagal memuat post sorotan');
        }

        // Ekstrak data posts dan pagination
        const posts = response.data || [];
        setPagination(response.pagination || null);

        // Format posts dan konversi tipe data yang diperlukan
        const formattedPosts = posts.map(post => ({
          ...post,
          id: String(post.id), // Konversi ke string untuk PropTypes
          image: post.image || '',
          is_spotlight: true,
          labels: Array.isArray(post.labels)
            ? post.labels.map(label => ({
                ...label,
                id: String(label.id) // Konversi ID label ke string
              }))
            : [],
          excerpt: post.excerpt || post.content?.substring(0, 150) || ''
        }));

        setSpotlightPosts(formattedPosts);
        setFilteredPosts(formattedPosts); // Initialize filtered posts with all posts
      } catch (err) {
        console.error('Error fetching spotlight posts:', err);
        setError('Gagal memuat post sorotan. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    loadSpotlightPosts();
  }, []);

  if (loading) {
    return (
      <div className="spotlight-page">
        <div className="spotlight-header">
          <h1 className="page-title">Post Sorotan</h1>
          <p className="spotlight-description">
            Artikel pilihan yang direkomendasikan oleh tim editorial kami
          </p>
        </div>
        <div className="spotlight-skeleton">
          {Array(6).fill(0).map((_, index) => (
            <div key={index} className="spotlight-item-skeleton">
              <Skeleton height={200} width="100%" className="mb-2" />
              <Skeleton height={24} width="80%" className="mb-2" />
              <Skeleton height={16} width="60%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotlight-page">
        <div className="spotlight-header">
          <h1 className="page-title">Post Sorotan</h1>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!spotlightPosts.length) {
    return (
      <div className="spotlight-page">
        <div className="spotlight-header">
          <h1 className="page-title">Post Sorotan</h1>
          <p className="spotlight-description">
            Artikel pilihan yang direkomendasikan oleh tim editorial kami
          </p>
        </div>
        <div className="no-posts">Tidak ada post sorotan saat ini.</div>
      </div>
    );
  }

  const postsToDisplay = searchTerm ? filteredPosts : spotlightPosts;

  return (
    <div className="spotlight-page">
      <div className="spotlight-header">
        <FaLightbulb size={30} color="#1a5f7a" style={{ marginBottom: '15px' }} />
        <h1 className="page-title">Post Sorotan</h1>
        <p className="spotlight-description">
          Artikel pilihan yang direkomendasikan oleh tim editorial kami
        </p>
      </div>

      <div className="search-section">
        <SpotlightSearchBar
          searchTerm={searchTerm}
          onSearch={handleSearch}
        />
      </div>

      {postsToDisplay.length === 0 && searchTerm ? (
        <div className="no-posts">
          <p>Tidak ada artikel sorotan yang sesuai dengan pencarian "{searchTerm}"</p>
          <button
            onClick={() => handleSearch('')}
            className="spotlight-search-button"
            style={{ marginTop: '15px' }}
          >
            Tampilkan Semua
          </button>
        </div>
      ) : (
        <div className="spotlight-grid">
          {postsToDisplay.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isSpotlight={true}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          {/* Tambahkan komponen pagination di sini jika diperlukan */}
        </div>
      )}
    </div>
  );
};

export default SpotlightPage;
