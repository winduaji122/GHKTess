import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import ResponsivePostImage from './common/ResponsivePostImage';
import { getImageUrl } from '../utils/imageHelper';
import './FeaturedPost.css';

function FeaturedPost({ post }) {
  // Hapus log yang tidak perlu untuk meningkatkan performa
  if (!post || typeof post !== 'object') {
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

  // Fungsi getImageUrl sudah diimpor dari utils/imageHelper.js

  // Hapus log yang tidak perlu untuk meningkatkan performa

  return (
    <Link to={`/post/${post.id}`} className="featured-post">
      <div className="featured-image-container">
        <ResponsivePostImage
          src={post.image}
          alt={post.title}
          className="featured-image"
          height="100%"
          width="100%"
          objectFit="cover"
          priority={true} // Prioritaskan pemuatan gambar featured
          onError={() => {
            console.error('Error loading featured image:', post.image);
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
