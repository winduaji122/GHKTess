import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { highlightText } from '../utils/highlightText.jsx';
import './SearchPage.css';
import DOMPurify from 'dompurify';
import { getLabels } from '../api/labelApi';
import { searchPosts } from '../api/postApi';
import SearchBar from './SearchBar';

function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labels, setLabels] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort') || 'relevance';
  const selectedLabel = searchParams.get('label_id') || '';

  const getImageUrl = useCallback((imagePath) => {
    if (!imagePath) return '';
    return imagePath.startsWith('http')
      ? imagePath
      : `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath.split('/').pop()}`;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const truncateContent = useCallback((content, maxLength = 200) => {
    if (!content) return '';
    const cleanContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength) + '...';
  }, []);

  const getLabelsFromPost = useCallback((post) => {
    if (!post?.labels) return [];

    try {
      if (Array.isArray(post.labels)) {
        return post.labels.map(label => ({
          id: label.id || label.label_id,
          label: label.label || label.name || 'TANPA LABEL'
        }));
      }

      if (typeof post.labels === 'string') {
        return post.labels.split(',').map(labelStr => {
          try {
            if (labelStr.includes(':')) {
              const [id, label] = labelStr.split(':');
              return { id, label: label || 'TANPA LABEL' };
            }
            const labelObj = JSON.parse(labelStr);
            return {
              id: labelObj.id || labelObj.label_id,
              label: labelObj.label || labelObj.name || 'TANPA LABEL'
            };
          } catch {
            return { id: '0', label: labelStr.trim() || 'TANPA LABEL' };
          }
        });
      }
      return [];
    } catch (error) {
      console.error('Error parsing labels:', error);
      return [];
    }
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await searchPosts({
        q: searchQuery,
        label_id: selectedLabel,
        page: currentPage,
        limit: 10,
        sort: sortBy
      });

      const filteredResults = response.data.data.filter(post =>
        post.status === 'published' && !post.deleted_at
      );

      setSearchResults(filteredResults);
      setTotalResults(response.data.pagination.totalItems);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching search results:', err);
      setError('Terjadi kesalahan saat mencari. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLabel, currentPage, sortBy]);

  useEffect(() => {
    if (searchQuery.trim() || selectedLabel) {
      fetchResults();
    } else {
      setSearchResults([]);
      setTotalResults(0);
      setTotalPages(1);
      setLoading(false);
    }
  }, [searchQuery, selectedLabel, currentPage, sortBy]);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labelsData = await getLabels();
        setLabels(labelsData);
      } catch (error) {
        console.error('Error fetching labels:', error);
        setError('Gagal memuat label');
      }
    };
    fetchLabels();
  }, []);

  const handleSearch = useCallback((newSearchTerm, newSelectedLabel) => {
    const newParams = new URLSearchParams();

    if (newSearchTerm?.trim()) {
      newParams.set('q', newSearchTerm.trim());
    }

    if (newSelectedLabel) {
      newParams.set('label_id', newSelectedLabel);
    }

    newParams.set('page', '1');

    if (sortBy) {
      newParams.set('sort', sortBy);
    }

    navigate(`/search?${newParams.toString()}`);
  }, [navigate, sortBy]);

  const handlePageChange = useCallback((page) => {
    navigate({
      pathname: '/search',
      search: `?${new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        sort: sortBy,
        ...(selectedLabel && { label_id: selectedLabel })
      }).toString()}`
    });
  }, [navigate, searchQuery, sortBy, selectedLabel]);

  const handleSortChange = useCallback((e) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', e.target.value);
    newParams.set('page', '1');
    navigate(`/search?${newParams.toString()}`);
  }, [navigate, searchParams]);

  const handlePostClick = useCallback((postId) => {
    navigate(`/post/${postId}`);
  }, [navigate]);

  const searchInfo = useMemo(() => ({
    totalResults: totalResults.toLocaleString(),
    searchTime: (Math.random() * 0.5 + 0.1).toFixed(2)
  }), [totalResults]);

  return (
    <div className="search-page">
      <SearchBar
        searchTerm={searchQuery}
        selectedLabel={selectedLabel}
        labels={labels}
        onSearch={handleSearch}
      />

      {(searchQuery || selectedLabel) && (
        <div className="active-filters">
          {searchQuery && <h1 className="search-title">Pencarian "{searchQuery.toUpperCase()}"</h1>}
          {selectedLabel && labels.length > 0 && (
            <div className="active-label">
              Filter Label: {labels.find(l => l.id === selectedLabel)?.name || 'Label tidak ditemukan'}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Mencari...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : Array.isArray(searchResults) && searchResults.length > 0 ? (
        searchResults.map((post) => (
          <div
            key={post.id}
            className="search-result-item"
            onClick={() => handlePostClick(post.id)}
          >
            <div className="result-image-container">
              {post.image && (
                <img
                  src={getImageUrl(post.image)}
                  alt={post.title}
                  className="result-image"
                  onError={(e) => {
                    console.error('Error loading image:', e.target.src);
                    e.target.onerror = null;
                    e.target.src = '/default-fallback-image.jpg';
                  }}
                />
              )}
            </div>
            <div className="result-content">
              <div className="result-header">
                <h2 className="result-title">
                  <Link to={`/post/${post.id}`}>
                    {highlightText(post.title, searchQuery)}
                  </Link>
                </h2>
                {(post.is_featured === true || post.is_featured === 1) && <span className="featured-badge">Featured</span>}
              </div>
              <div className="result-meta">
                <span className="result-date">{formatDate(post.publish_date)}</span>
                <span className="result-views"><i className="fas fa-eye"></i> {post.views || 0}</span>
                <span className="result-comments"><i className="fas fa-comment"></i> {post.comments_count || 0}</span>
              </div>
              <div className="result-labels">
                {getLabelsFromPost(post).map((label) => (
                  <span key={label.id} className="result-label">{label.label.toUpperCase()}</span>
                ))}
              </div>
              <p className="result-snippet">
                {highlightText(truncateContent(post.content), searchQuery)}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="no-results">Tidak ada hasil yang ditemukan.</div>
      )}
      {totalPages > 1 && (
        <div className="pagination">
          {currentPage > 1 && (
            <button onClick={() => handlePageChange(currentPage - 1)} className="pagination-button">Sebelumnya</button>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + Math.max(1, currentPage - 2)).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-button ${page === currentPage ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
          {currentPage < totalPages && (
            <button onClick={() => handlePageChange(currentPage + 1)} className="pagination-button">Selanjutnya</button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
