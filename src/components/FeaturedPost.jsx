import React, { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './FeaturedPost.css';

function FeaturedPost({ post }) {
  useEffect(() => {
    console.log('FeaturedPost rendered with post:', post);
  }, [post]);

  if (!post || typeof post !== 'object') {
    console.log('FeaturedPost received invalid post:', post);
    return null;
  }

  const truncateContent = useCallback((content, maxLength = 200) => {
    if (!content) return '';
    const strippedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    const decodedContent = strippedContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    return decodedContent.length > maxLength
      ? `${decodedContent.substr(0, maxLength)}...`
      : decodedContent;
  }, []);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath.split('/').pop()}`;
  };

  console.log('Rendering FeaturedPost with:', {
    id: post.id,
    title: post.title,
    image: post.image,
    contentPreview: post.content ? post.content.substring(0, 50) : 'No content'
  });

  return (
    <Link to={`/post/${post.id}`} className="featured-post">
      <div className="featured-image-container">
        <img
          src={getImageUrl(post.image)}
          alt={post.title}
          className="featured-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-fallback-image.jpg'; // Ganti dengan path gambar fallback Anda
          }}
        />
        <div className="featured-label">Headline</div>
      </div>
      <div className="featured-content">
        <div className="featured-content-wrapper">
          <div className="featured-vertical-line"></div>
          <div className="featured-text-content">
            <h2 className="featured-title">{post.title}</h2>
            <div
              className="featured-excerpt"
              dangerouslySetInnerHTML={{ __html: truncateContent(post.content, 150) }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default FeaturedPost;
