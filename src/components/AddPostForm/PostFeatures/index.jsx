import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import FeaturedToggle from './FeaturedToggle';
import SpotlightToggle from './SpotlightToggle';

const PostFeatures = ({ post, isAdmin, onFeaturedToggle, onSpotlightToggle }) => {
  console.log('PostFeatures render:', { 
    isAdmin, 
    is_featured: Boolean(post?.is_featured),
    is_spotlight: Boolean(post?.is_spotlight)
  });

  const handleSpotlightChange = useCallback((checked) => {
    console.log('Spotlight change in PostFeatures:', checked);
    onSpotlightToggle(checked);
  }, [onSpotlightToggle]);

  const handleFeaturedChange = useCallback((checked) => {
    console.log('Featured change in PostFeatures:', checked);
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