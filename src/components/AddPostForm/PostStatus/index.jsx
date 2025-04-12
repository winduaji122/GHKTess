import React from 'react';
import PropTypes from 'prop-types';
import PostStatusDropdown from './PostStatusDropdown';
import './PostStatusDropdown.css';

const PostStatus = ({ status, onChange, role }) => {
  return (
    <div className="status-container">
      <label htmlFor="post-status" className="status-label">Status Post</label>
      <PostStatusDropdown
        value={status}
        onChange={onChange}
        role={role}
      />
      {role !== 'admin' && (
        <p className="status-info">
          Sebagai penulis, Anda hanya dapat menyimpan post sebagai Draft. Admin akan memeriksa dan mempublikasikan post Anda.
        </p>
      )}
    </div>
  );
};

PostStatus.propTypes = {
  status: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  role: PropTypes.string
};

PostStatus.defaultProps = {
  status: 'draft',
  role: 'writer'
};

export default PostStatus;