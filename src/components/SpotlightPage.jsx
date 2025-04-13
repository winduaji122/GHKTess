import React, { useState, useEffect } from 'react';
import { getSpotlightPosts } from '../api/postApi';
import PostCard from './PostCard';
import './SpotlightPage.css';

const SpotlightPage = () => {
  const [spotlightPosts, setSpotlightPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <div className="loading">Memuat post sorotan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotlight-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!spotlightPosts.length) {
    return (
      <div className="spotlight-page">
        <h1 className="page-title">Post Sorotan</h1>
        <div className="no-posts">Tidak ada post sorotan saat ini.</div>
      </div>
    );
  }

  return (
    <div className="spotlight-page">
      <h1 className="page-title">Post Sorotan</h1>
      <div className="spotlight-grid">
        {spotlightPosts.map(post => (
          <PostCard 
            key={post.id} 
            post={post} 
            isSpotlight={true}
          />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          {/* Tambahkan komponen pagination di sini jika diperlukan */}
        </div>
      )}
    </div>
  );
};

export default SpotlightPage;
