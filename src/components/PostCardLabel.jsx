import React, { useCallback } from 'react';
import { FaCalendarAlt, FaUser, FaTag, FaEye, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import LazyImage from './common/LazyImage';
import '../styles/lazyImage.css';
import './PostCardLabel.css';
import { getImageUrl, getResponsiveImageUrls } from '../utils/imageHelper';

const PostCardLabel = ({ post, onClick, isFeatured = false }) => {
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
  const getPostImageUrl = (imagePath) => {
    if (!imagePath) return '/default-post-image.jpg';

    // Cek apakah imagePath adalah UUID (format baru)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof imagePath === 'string' && uuidPattern.test(imagePath)) {
      // Gunakan getResponsiveImageUrls untuk mendapatkan URL gambar dengan berbagai ukuran
      const imageUrls = getResponsiveImageUrls(imagePath);
      return isFeatured ? imageUrls.original : imageUrls.medium; // Gunakan ukuran sesuai kebutuhan
    }

    // Gunakan fungsi getImageUrl dari utils/imageHelper.js
    return getImageUrl(imagePath);
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

  // Estimate reading time based on content length
  const getReadingTime = () => {
    if (!post.content) return '2 menit';

    // Clean HTML tags first
    const cleanContent = cleanHtmlTags(post.content);

    const wordsPerMinute = 200; // Average reading speed
    const wordCount = cleanContent.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute)); // Minimum 1 minute
    return `${readingTime} menit`;
  };

  // Get view count with formatting
  const getViewCount = () => {
    if (!post.views) return '0';
    return post.views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Clean HTML tags from text
  const cleanHtmlTags = (html) => {
    if (!html) return '';

    // Check if the content is a string
    if (typeof html !== 'string') {
      return '';
    }

    // Replace common HTML tags with empty string
    return html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Trim leading and trailing spaces
  };

  if (isFeatured) {
    return (
      <div className="writer-featured-post" onClick={onClick || handleCardClick}>
        <div className="writer-featured-post-image-container">
          <LazyImage
            src={getPostImageUrl(post.image)}
            alt={post.title}
            className="writer-featured-post-image"
            height="400px"
            width="100%"
            objectFit="cover"
          />
          {post.labels && post.labels.length > 0 && (
            <div className="writer-featured-post-category">
              {typeof post.labels[0] === 'string' ? post.labels[0] : post.labels[0].label}
            </div>
          )}
        </div>
        <div className="writer-featured-post-content">
          <h2 className="writer-featured-post-title">{post.title}</h2>

          <div className="writer-featured-post-meta">
            <div className="writer-featured-post-meta-item">
              <FaCalendarAlt className="writer-featured-post-meta-icon" />
              <span>{getValidDate()}</span>
            </div>
            <div className="writer-featured-post-meta-item">
              <FaUser className="writer-featured-post-meta-icon" />
              <span>{getAuthorName()}</span>
            </div>
            <div className="writer-featured-post-meta-item">
              <FaClock className="writer-featured-post-meta-icon" />
              <span>{getReadingTime()}</span>
            </div>
            <div className="writer-featured-post-meta-item">
              <FaEye className="writer-featured-post-meta-icon" />
              <span>{getViewCount()} dibaca</span>
            </div>
          </div>

          <p className="writer-featured-post-excerpt">
            {post.excerpt
              ? cleanHtmlTags(post.excerpt)
              : (post.content ? cleanHtmlTags(post.content).substring(0, 250) + '...' : 'Tidak ada deskripsi')}
          </p>

          <div className="writer-featured-post-footer">
            <button className="writer-featured-post-read-more">Baca Selengkapnya</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="writer-post-card" onClick={onClick || handleCardClick}>
      <div className="writer-post-card-image-container">
        <LazyImage
          src={getPostImageUrl(post.image)}
          alt={post.title}
          className="writer-post-card-image"
          height="180px"
          width="100%"
          objectFit="cover"
        />
        {post.labels && post.labels.length > 0 && (
          <div className="writer-post-card-category">
            {typeof post.labels[0] === 'string' ? post.labels[0] : post.labels[0].label}
          </div>
        )}
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

        <p className="writer-post-card-excerpt">
          {post.excerpt
            ? cleanHtmlTags(post.excerpt)
            : (post.content ? cleanHtmlTags(post.content).substring(0, 120) + '...' : 'Tidak ada deskripsi')}
        </p>

        <div className="writer-post-card-footer">
          <button className="writer-post-card-read-more">Baca</button>
        </div>
      </div>
    </div>
  );
};

export default PostCardLabel;
