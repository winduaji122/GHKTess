import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RelatedPostWidget.css';

const formatDate = (dateString) => {
  if (!dateString) return 'Tanggal tidak tersedia';

  try {
    // Parse tanggal
    const date = new Date(dateString);

    // Validasi tanggal
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Tanggal tidak tersedia';
    }

    // Format tanggal ke Indonesia
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);

  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Tanggal tidak tersedia';
  }
};

// Fungsi untuk mendapatkan tanggal yang valid
const getValidDate = (post) => {
  console.log('Post data for date formatting:', post);

  // Prioritaskan publish_date, lalu created_at
  if (post.publish_date) {
    const formattedDate = formatDate(post.publish_date);
    console.log('Using publish_date:', formattedDate);
    return formattedDate;
  }

  if (post.created_at) {
    const formattedDate = formatDate(post.created_at);
    console.log('Using created_at:', formattedDate);
    return formattedDate;
  }

  // Jika tidak ada tanggal, gunakan tanggal saat ini
  console.log('No valid date found for post:', post.title);
  console.log('Using current date as fallback');
  const currentDate = new Date();
  return formatDate(currentDate.toISOString());
};

// Dalam komponen RelatedPostItem, tambahkan logging
function RelatedPostItem({ post, onClick }) {
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_URL}/uploads/${imagePath.split('/').pop()}`;
  };

  // Debug untuk melihat data post
  console.log('Related post data:', post);

  // Tambahkan console.log untuk debugging
  console.log('Post data received:', {
    post_date: post.post_date,
    publish_date: post.publish_date,
    published_date: post.published_date,
    created_at: post.created_at,
    createdAt: post.createdAt
  });

  // Debug untuk format tanggal
  console.log('Post data for display:', {
    title: post.title,
    publish_date: post.publish_date,
    created_at: post.created_at
  });

  // Jika tidak ada tanggal, tambahkan tanggal saat ini
  if (!post.publish_date && !post.created_at) {
    console.log('Adding current date as fallback for post:', post.title);
    post.created_at = new Date().toISOString();
  }

  // Cek apakah menggunakan tanggal fallback
  const isFallbackDate = !post.publish_date && !post.created_at;
  const dateForDisplay = getValidDate(post);
  console.log('Final date for display:', dateForDisplay, 'isFallback:', isFallbackDate);

  return (
    <div className="related-post-item" onClick={() => onClick(post.slug || post.id)}>
      <div className="related-post-image-container">
        <img
          src={getImageUrl(post.image)}
          alt={post.title}
          className="related-post-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-fallback-image.jpg';
          }}
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
