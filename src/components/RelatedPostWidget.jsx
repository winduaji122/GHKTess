import React from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './common/LazyImage';
import '../styles/lazyImage.css';
import './RelatedPostWidget.css';

// Fungsi untuk mendapatkan tanggal yang valid
const getValidDate = (post) => {
  // Prioritaskan publish_date, lalu created_at
  const formattedDate = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : post.created_at
      ? new Date(post.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'Tanggal tidak tersedia';

  return formattedDate;
};

// Dalam komponen RelatedPostItem, tambahkan logging
function RelatedPostItem({ post, onClick }) {
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath.split('/').pop()}`;
  };

  // Debug tanggal
  console.log('Related post data for date:', {
    title: post.title,
    publish_date: post.publish_date,
    created_at: post.created_at
  });

  // Dapatkan tanggal untuk ditampilkan
  const dateForDisplay = getValidDate(post);
  const isFallbackDate = dateForDisplay === 'Tanggal tidak tersedia';

  return (
    <div className="related-post-item" onClick={() => onClick(post.slug || post.id)}>
      <div className="related-post-image-container">
        <LazyImage
          src={getImageUrl(post.image)}
          alt={post.title}
          className="related-post-image"
          height="180px"
          width="100%"
          objectFit="cover"
        />
      </div>
      <div className="related-post-content">
        <h3 className="related-post-title">{post.title}</h3>
        <div className={`related-post-date ${isFallbackDate ? 'fallback' : ''}`}>
          {dateForDisplay}
        </div>
        {post.labels && post.labels.length > 0 && (
          <div className="related-post-labels">
            {post.labels.slice(0, 2).map((label, index) => (
              <span key={index} className="related-post-label">
                {typeof label === 'string' ? label : label.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RelatedPostWidget({ relatedPosts }) {
  const navigate = useNavigate();

  const handlePostClick = (identifier) => {
    if (!identifier) {
      console.error('Invalid post identifier');
      return;
    }
    // Menggunakan replace: true untuk mencegah double fetching
    navigate(`/post/${identifier}`, { replace: true });
  };

  return (
    <div className="related-post-widget sidebar-widget">
      <h2 className="widget-title sidebar-widget-title">Artikel Terkait</h2>
      <div className="related-post-list">
        {Array.isArray(relatedPosts) && relatedPosts.length > 0 ? (
          relatedPosts.slice(0, 4).map((post) => (
            <RelatedPostItem
              key={post.id}
              post={post}
              onClick={handlePostClick}
            />
          ))
        ) : (
          <p className="no-related-posts">Tidak ada artikel terkait.</p>
        )}
      </div>
    </div>
  );
}

export default RelatedPostWidget;
