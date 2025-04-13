import React from 'react';
import PropTypes from 'prop-types';
import './PostStatusDropdown.css';

const PostStatusDropdown = ({ value, onChange, role = 'writer' }) => {
  const currentValue = value || 'draft';
  const isAdmin = role === 'admin';

  // Jika user bukan admin dan status bukan draft, tetap tampilkan status saat ini
  // tapi disable opsi lain
  const showCurrentNonDraftStatus = !isAdmin && currentValue !== 'draft';
  return (
    <select
      id="post-status"
      value={currentValue}
      onChange={(e) => {
        // Jika user bukan admin, hanya izinkan mengubah ke draft
        if (!isAdmin && e.target.value !== 'draft') {
          console.log('Writer hanya dapat mengatur status draft');
          return;
        }
        onChange(e.target.value);
      }}
      className={`status-dropdown ${currentValue}`}
    >
      <option value="draft">📝 Draft</option>
      {(isAdmin || showCurrentNonDraftStatus) && (
        <>
          <option value="published" disabled={!isAdmin}>✅ Published</option>
          <option value="archived" disabled={!isAdmin}>🗄️ Archived</option>
        </>
      )}
    </select>
  );
};

PostStatusDropdown.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  role: PropTypes.string
};

PostStatusDropdown.defaultProps = {
  value: 'draft',
  role: 'writer'
};

export default PostStatusDropdown;