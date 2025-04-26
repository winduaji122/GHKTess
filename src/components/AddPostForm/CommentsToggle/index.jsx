import React from 'react';
import './CommentsToggle.css';
import { FaComments, FaCommentSlash } from 'react-icons/fa';

const CommentsToggle = ({ enabled, onChange }) => {
  const handleToggle = () => {
    onChange(!enabled);
  };

  return (
    <div className="writer-comments-toggle">
      <label className="writer-comments-toggle-label">
        <span className="writer-comments-toggle-text">
          {enabled ? 'Komentar Diaktifkan' : 'Komentar Dinonaktifkan'}
        </span>
        <div 
          className={`writer-comments-toggle-switch ${enabled ? 'enabled' : 'disabled'}`}
          onClick={handleToggle}
        >
          <div className="writer-comments-toggle-slider"></div>
          <div className="writer-comments-toggle-icon">
            {enabled ? <FaComments /> : <FaCommentSlash />}
          </div>
        </div>
      </label>
      <p className="writer-comments-toggle-hint">
        {enabled 
          ? 'Pembaca dapat menambahkan komentar pada post ini' 
          : 'Pembaca tidak dapat menambahkan komentar pada post ini'}
      </p>
    </div>
  );
};

export default CommentsToggle;
