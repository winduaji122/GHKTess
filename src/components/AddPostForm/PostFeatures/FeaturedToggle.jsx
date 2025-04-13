import React from 'react';
import PropTypes from 'prop-types';
import './ToggleStyles.css';

const FeaturedToggle = ({ isChecked, onChange, disabled }) => {
  return (
    <div className="checkbox-container">
      <label className="featured-checkbox">
        <input
          type="checkbox"
          checked={isChecked || false}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          name="is_featured"
          id="is_featured"
        />
        <span className="featured-slider"></span>
      </label>
      <span className="featured-edit-post">
        Tampilkan di HEADLINE
      </span>
    </div>
  );
};

FeaturedToggle.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

FeaturedToggle.defaultProps = {
  isChecked: false,
  disabled: false
};

export default FeaturedToggle;