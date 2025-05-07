// frontend/src/components/SpotlightWidget.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './SpotlightWidget.css';
import ResponsivePostImage from './common/ResponsivePostImage';
import { Link, useNavigate } from 'react-router-dom';

const SpotlightWidget = ({ posts, limit = 5 }) => {
  const navigate = useNavigate();

  const spotlightPosts = Array.isArray(posts?.data) ? posts.data :
                        Array.isArray(posts) ? posts : [];

  if (spotlightPosts.length === 0) {
    return <div className="spotlight-widget">Tidak ada post sorotan saat ini.</div>;
  }

  const limitedPosts = spotlightPosts.slice(0, limit);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath.split('/').pop()}`;
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const truncateContent = (content, maxLength = 100) => {
    const strippedContent = stripHtml(content);
    if (strippedContent.length <= maxLength) return strippedContent;
    return strippedContent.substring(0, maxLength) + '...';
  };

  const handlePostClick = (slug) => {
    navigate(`/post/${slug}`);
  };

  return (
    <aside className="spotlight-widget">
      <h2 className="spotlight-title">Sorotan</h2>
      <div className="spotlight-posts">
        {limitedPosts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.slug || post.id}`}
            className="spotlight-item"
          >
            {post.image && (
              <div className="spotlight-item-image-container">
                <ResponsivePostImage
                  src={post.image}
                  alt={post.title}
                  className="spotlight-item-image"
                  height="180px"
                  width="100%"
                  objectFit="cover"
                />
              </div>
            )}
            <h3 className="spotlight-item-title">{post.title}</h3>
            <p className="spotlight-item-excerpt">
              {truncateContent(post.excerpt || post.content)}
            </p>
          </Link>
        ))}
      </div>
      {spotlightPosts.length > limit && (
        <Link to="/spotlight" className="see-all-link">
          Lihat Semua Post Sorotan
        </Link>
      )}
    </aside>
  );
};

SpotlightWidget.propTypes = {
  posts: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.string,
      image: PropTypes.string,
      excerpt: PropTypes.string,
      slug: PropTypes.string
    })),
    PropTypes.shape({
      data: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        content: PropTypes.string,
        image: PropTypes.string,
        excerpt: PropTypes.string,
        slug: PropTypes.string
      })),
      pagination: PropTypes.object
    })
  ]).isRequired,
  limit: PropTypes.number
};

export default SpotlightWidget;
