import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import FeaturedToggle from './FeaturedToggle';
import SpotlightToggle from './SpotlightToggle';

const PostFeatures = ({ post, isAdmin, onFeaturedToggle, onSpotlightToggle }) => {
  // Hapus console.log yang tidak perlu

  const handleSpotlightChange = useCallback((checked) => {
    onSpotlightToggle(checked);
  }, [onSpotlightToggle]);

  const handleFeaturedChange = useCallback((checked) => {
    onFeaturedToggle(checked);
  }, [onFeaturedToggle]);

  return (
    <div className="post-features">
      {isAdmin && (
        <FeaturedToggle
          isChecked={Boolean(post?.is_featured)}
          onChange={handleFeaturedChange}
          disabled={!isAdmin}
        />
      )}
      <SpotlightToggle
        isChecked={Boolean(post?.is_spotlight)}
        onChange={handleSpotlightChange}
        disabled={!isAdmin}
      />
    </div>
  );
};

PostFeatures.propTypes = {
  post: PropTypes.shape({
    is_featured: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
    is_spotlight: PropTypes.oneOfType([PropTypes.bool, PropTypes.number])
  }).isRequired,
  isAdmin: PropTypes.bool.isRequired,
  onFeaturedToggle: PropTypes.func.isRequired,
  onSpotlightToggle: PropTypes.func.isRequired
};

PostFeatures.defaultProps = {
  isAdmin: false,
  post: {
    is_featured: false,
    is_spotlight: false
  }
};

export default PostFeatures;