import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPopularPosts } from '../api/postApi';
import ResponsivePostImage from './common/ResponsivePostImage';
import { getImageUrl, getResponsiveImageUrls } from '../utils/imageHelper';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './PopularPostsWidget.css';

const PopularPostsWidget = ({ limit = 5 }) => {
  const [posts, setPosts] = useState([]);
  const [featuredPost, setFeaturedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopularPosts = async () => {
      try {
        setLoading(true);
        // Ambil limit + 1 post untuk mendapatkan featured post juga
        const response = await getPopularPosts(limit + 1);

        if (response.success && response.data.length > 0) {
          // Post pertama (paling populer) dijadikan featured post
          setFeaturedPost(response.data[0]);

          // Post lainnya dijadikan daftar post populer
          setPosts(response.data.slice(1, limit + 1));
        } else {
          setError('Gagal memuat artikel populer');
        }
      } catch (err) {
        console.error('Error fetching popular posts:', err);
        setError('Terjadi kesalahan saat memuat artikel populer');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularPosts();
  }, [limit]);

  if (loading) {
    return (
      <div>
        <h2 className="popular-posts-title">Artikel Populer</h2>
        <div className="popular-posts-container">
          <div className="popular-posts-list">
            {Array(limit).fill(0).map((_, index) => (
              <div key={index} className="popular-post-item-skeleton">
                <div className="popular-post-image-skeleton">
                  <Skeleton height={80} width={80} />
                </div>
                <div className="popular-post-content-skeleton">
                  <Skeleton height={20} width="80%" count={2} />
                  <Skeleton height={15} width="40%" />
                </div>
              </div>
            ))}
          </div>
          <div className="popular-featured-skeleton">
            <Skeleton height={200} width="100%" />
            <div style={{ padding: "15px 0 0 0" }}>
              <Skeleton height={30} width="80%" style={{ marginBottom: "10px" }} />
              <Skeleton height={15} width="100%" count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="popular-posts-title">Artikel Populer</h2>
        <div className="popular-posts-error">
          {error}
        </div>
      </div>
    );
  }

  if ((!posts || posts.length === 0) && !featuredPost) {
    return null;
  }

  return (
    <div>
      <h2 className="popular-posts-title">Artikel Populer</h2>
      <div className="popular-posts-container">
        <div className="popular-posts-list">
          {posts.map((post) => (
            <Link
              to={`/post/${post.slug}`}
              key={post.id}
              className="popular-post-item"
            >
              <div className="popular-post-image">
                <ResponsivePostImage
                  src={post.image}
                  alt={post.title}
                  height="80px"
                  width="80px"
                  objectFit="cover"
                  size="thumbnail" // Gunakan ukuran thumbnail untuk daftar post
                />
              </div>
              <div className="popular-post-content">
                <h3 className="popular-post-title">{post.title}</h3>
                <p className="popular-post-date">
                  {new Date(post.publish_date || post.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {featuredPost && (
          <Link
            to={`/post/${featuredPost.slug}`}
            className="popular-featured"
          >
            <div className="popular-featured-image">
              <ResponsivePostImage
                src={featuredPost.image}
                alt={featuredPost.title}
                height="200px"
                width="100%"
                objectFit="cover"
                priority={true}
                size="medium" // Gunakan ukuran medium untuk featured post
              />
            </div>
            <div className="popular-featured-content">
              <h3 className="popular-featured-title">{featuredPost.title}</h3>
              <p className="popular-featured-excerpt">
                {featuredPost.excerpt ?
                  (featuredPost.excerpt.length > 100 ? featuredPost.excerpt.substring(0, 100) + '...' : featuredPost.excerpt) :
                  (featuredPost.content ? featuredPost.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : '')}
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default PopularPostsWidget;
