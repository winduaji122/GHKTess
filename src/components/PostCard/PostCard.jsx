import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageHelper';
import './PostCard.css';

const PostCard = ({ post }) => {
  // Pastikan post.image adalah string sebelum memanggil getImageUrl
  const imageUrl = React.useMemo(() => {
    if (!post.image) return null;
    
    // Log untuk debugging
    if (typeof post.image === 'object') {
      console.warn('Post image is an object in PostCard:', post.image);
    }
    
    return getImageUrl(post.image);
  }, [post.image]);
  
  return (
    <div className="post-card">
      {imageUrl ? (
        <div className="post-card-image">
          <img 
            src={imageUrl} 
            alt={post.title} 
            onError={(e) => {
              console.error('Error loading image:', e.target.src);
              e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
            }}
          />
        </div>
      ) : (
        <div className="post-card-no-image">
          <span>No Image</span>
        </div>
      )}
      
      <div className="post-card-content">
        <h3 className="post-card-title">
          <Link to={`/posts/${post.id}`}>{post.title}</Link>
        </h3>
        <p className="post-card-excerpt">{post.excerpt || post.content.substring(0, 100)}...</p>
        <div className="post-card-meta">
          <span className="post-card-date">
            {new Date(post.publish_date).toLocaleDateString()}
          </span>
          {post.author && (
            <span className="post-card-author">by {post.author.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard; 