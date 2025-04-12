import React, { useCallback } from 'react';
import { FaCalendarAlt, FaUser, FaTag } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './PostCardLabel.css';

const PostCardLabel = ({ post, onClick }) => {
  const navigate = useNavigate();

  const handleCardClick = useCallback((e) => {
    e.preventDefault();
    if (post?.slug) {
      navigate(`/post/${post.slug}`);
    } else if (post?.id) {
      navigate(`/post/${post.id}`);
    } else {
      console.error('Invalid post data:', post);
    }
  }, [post, navigate]);
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Tanggal tidak tersedia';

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Get valid date (publish_date or created_at)
  const getValidDate = () => {
    if (post.publish_date) {
      return formatDate(post.publish_date);
    }
    if (post.created_at) {
      return formatDate(post.created_at);
    }
    return 'Tanggal tidak tersedia';
  };

  // Get image URL with fallback
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/default-post-image.jpg';

    // If image is already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Fix double uploads in path
    if (imagePath.includes('/uploads/uploads/')) {
      imagePath = imagePath.replace('/uploads/uploads/', '/uploads/');
    }

    // If image is a relative path with /uploads/
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_BASE_URL}${imagePath}`;
    }

    // Otherwise, assume it's just a filename
    return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath}`;
  };

  // Get author name
  const getAuthorName = () => {
    if (post.author && post.author.name) {
      return post.author.name;
    }
    if (post.author_name) {
      return post.author_name;
    }
    return 'Penulis';
  };

  return (
    <div className="writer-post-card" onClick={onClick || handleCardClick}>
      <div className="writer-post-card-image-container">
        <img
          src={getImageUrl(post.image)}
          alt={post.title}
          className="writer-post-card-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-post-image.jpg';
          }}
        />
      </div>
      <div className="writer-post-card-content">
        <h2 className="writer-post-card-title">{post.title}</h2>

        <div className="writer-post-card-meta">
          <div className="writer-post-card-meta-item">
            <FaCalendarAlt className="writer-post-card-meta-icon" />
            <span>{getValidDate()}</span>
          </div>

          <div className="writer-post-card-meta-item">
            <FaUser className="writer-post-card-meta-icon" />
            <span>{getAuthorName()}</span>
          </div>
        </div>

        <p className="writer-post-card-excerpt">{post.excerpt || (post.content && post.content.substring(0, 150) + '...')}</p>

        {post.labels && post.labels.length > 0 && (
          <div className="writer-post-card-labels">
            <FaTag className="writer-post-card-label-icon" />
            <div className="writer-post-card-label-list">
              {post.labels.slice(0, 3).map((label, index) => (
                <span key={index} className="writer-post-card-label">
                  {typeof label === 'string' ? label : label.label}
                </span>
              ))}
              {post.labels.length > 3 && (
                <span className="writer-post-card-label-more">+{post.labels.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <div className="writer-post-card-footer">
          <button className="writer-post-card-read-more">Baca Selengkapnya</button>
        </div>
      </div>
    </div>
  );
};

export default PostCardLabel;
