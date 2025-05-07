import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PostCard.css';
import ResponsivePostImage from './common/ResponsivePostImage';
import { getImageUrl } from '../utils/imageHelper';
import PropTypes from 'prop-types';

const PostCard = React.memo(function PostCard({ post, index, isSpotlight }) {
  const navigate = useNavigate();

  const truncateContent = useCallback((content, maxLength = isSpotlight ? 50 : 100) => {
    if (!content) return '';
    const strippedContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    const decodedContent = strippedContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    const truncated = decodedContent.length > maxLength
      ? `${decodedContent.substr(0, maxLength)}...`
      : decodedContent;
    return truncated.split('\n').slice(0, isSpotlight ? 1 : 2).join('\n');
  }, [isSpotlight]);

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

  const getLabels = useCallback(() => {
    if (!post?.labels) return [];
    if (Array.isArray(post.labels)) {
      return post.labels.map(label => {
        if (typeof label === 'string') return label;
        if (typeof label === 'object' && label.label) return label.label;
        if (typeof label === 'object' && label.name) return label.name;
        return '';
      }).filter(Boolean);
    }
    if (typeof post.labels === 'string') {
      return post.labels.split(',').map(label => label.trim());
    }
    return [];
  }, [post?.labels]);

  // Fungsi getImageUrl sudah diimpor dari utils/imageHelper.js

  const postContent = useMemo(() => {
    if (!post || typeof post !== 'object') {
      console.error('Invalid post data:', post);
      return null;
    }

    const labels = getLabels();

    return (
      <>
        <div className="post-card-image-container">
          <ResponsivePostImage
            src={post.image}
            alt={post.title || 'Post image'}
            className="post-card-image"
            height="200px"
            width="100%"
            objectFit="cover"
            size="thumbnail" // Gunakan ukuran thumbnail untuk performa lebih baik
          />
          {!isSpotlight && labels.length > 0 && (
            <div className="post-card-labels-overlay">
              {labels.map((label, index) => {
                const labelText = typeof label === 'string' ? label : (label.label || label.name || '');
                return (
                  <span key={index} className="post-card-label">
                    {labelText.toUpperCase()}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="post-card-content">
          <h3 className="post-card-title">{post.title || 'Untitled'}</h3>
          {!isSpotlight && (
            <div className="post-card-excerpt">
              {truncateContent(post.content) || 'No content available'}
            </div>
          )}
        </div>
      </>
    );
  }, [post, getImageUrl, getLabels, truncateContent, isSpotlight]);

  if (!postContent) {
    return null;
  }

  return (
    <div
      className={`post-card ${isSpotlight ? 'spotlight-card' : ''}`}
      data-index={index}
      onClick={handleCardClick}
    >
      {postContent}
    </div>
  );
});

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    content: PropTypes.string,
    image: PropTypes.string,
    labels: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string
    }))
  }).isRequired,
  index: PropTypes.number,
  isSpotlight: PropTypes.bool
};

export default PostCard;
