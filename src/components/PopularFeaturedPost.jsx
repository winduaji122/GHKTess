import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPopularPosts } from '../api/postApi';
import { getImageUrl } from '../utils/imageHelper';
import LazyImage from './common/LazyImage';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './PopularFeaturedPost.css';

const PopularFeaturedPost = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopularFeaturedPost = async () => {
      try {
        setLoading(true);
        const response = await getPopularPosts(1); // Ambil hanya 1 post terpopuler
        
        if (response.success && response.data.length > 0) {
          setPost(response.data[0]);
        } else {
          setError('Tidak ada artikel populer yang tersedia');
        }
      } catch (err) {
        console.error('Error fetching popular featured post:', err);
        setError('Terjadi kesalahan saat memuat artikel populer');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularFeaturedPost();
  }, []);

  if (loading) {
    return (
      <div className="writer-popular-featured">
        <h2 className="writer-popular-featured-title">Paling Populer</h2>
        <div className="writer-popular-featured-skeleton">
          <Skeleton height={200} />
          <Skeleton height={30} width="80%" style={{ marginTop: '10px' }} />
          <Skeleton height={20} width="60%" style={{ marginTop: '5px' }} />
          <Skeleton height={15} width="40%" style={{ marginTop: '5px' }} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return null;
  }

  return (
    <div className="writer-popular-featured">
      <h2 className="writer-popular-featured-title">Paling Populer</h2>
      <Link to={`/post/${post.slug}`} className="writer-popular-featured-link">
        <div className="writer-popular-featured-image">
          <LazyImage
            src={getImageUrl(post.image)}
            alt={post.title}
            height="200px"
            width="100%"
            objectFit="cover"
          />
          <div className="writer-popular-featured-views">
            <span>{post.views || 0} views</span>
          </div>
        </div>
        <h3 className="writer-popular-featured-post-title">{post.title}</h3>
        <p className="writer-popular-featured-excerpt">
          {post.excerpt ? 
            (post.excerpt.length > 100 ? post.excerpt.substring(0, 100) + '...' : post.excerpt) : 
            (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : '')}
        </p>
        <p className="writer-popular-featured-date">
          {new Date(post.publish_date || post.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </Link>
    </div>
  );
};

export default PopularFeaturedPost;
