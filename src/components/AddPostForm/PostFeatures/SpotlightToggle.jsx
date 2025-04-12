import React from 'react';
import PropTypes from 'prop-types';

const SpotlightToggle = ({ isChecked, onChange, disabled }) => {
  return (
    <div className="checkbox-container">
      <label className="spotlight-checkbox">
        <input
          type="checkbox"
          checked={isChecked || false}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          name="is_spotlight"
          id="is_spotlight"
        />
        <span className="spotlight-slider"></span>
      </label>
      <span className="spotlight-label">
        Tampilkan di SpotLight
      </span>
    </div>
  );
};

SpotlightToggle.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

SpotlightToggle.defaultProps = {
  isChecked: false,
  disabled: false
};

export default SpotlightToggle;