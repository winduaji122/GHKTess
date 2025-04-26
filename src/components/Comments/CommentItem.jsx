import React, { useState, useMemo } from 'react';
import { FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import CommentForm from './CommentForm';
import { formatDate } from '../../utils/dateHelper';
import { getValidProfileUrl } from '../../utils/profileHelper';
import { getInitials } from '../../utils/avatarHelper';
import './Comments.css';

const CommentItem = ({
  comment,
  currentUser,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onCancelEdit
}) => {
  const [showOptions, setShowOptions] = useState(false);

  // Format tanggal komentar
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes < 1) {
        return 'Baru saja';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} menit yang lalu`;
      } else if (diffHours < 24) {
        return `${diffHours} jam yang lalu`;
      } else if (diffDays < 7) {
        return `${diffDays} hari yang lalu`;
      } else {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Cek apakah user adalah pemilik komentar atau admin
  const canModify = currentUser && (
    currentUser.id === comment.user_id ||
    currentUser.role === 'admin'
  );

  // Toggle menu options
  const toggleOptions = (e) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  // Close options when clicking outside
  const handleClickOutside = () => {
    if (showOptions) {
      setShowOptions(false);
    }
  };

  // Add event listener for clicking outside
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showOptions]);

  // Handle edit button click
  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit();
    setShowOptions(false);
  };

  // Handle delete button click
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
      onDelete();
    }
    setShowOptions(false);
  };

  // Mendapatkan URL profil yang valid
  const profilePicture = useMemo(() => {
    if (!comment.profile_picture) return null;
    console.log('Original profile picture:', comment.profile_picture);
    return getValidProfileUrl(comment.profile_picture);
  }, [comment.profile_picture]);

  return (
    <div className="writer-comment-item">
      <div className="writer-comment-avatar">
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={`${comment.user_name}'s avatar`}
            onError={(e) => {
              console.log('Error loading image:', profilePicture);
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="writer-avatar-fallback"
          style={{ display: profilePicture ? 'none' : 'flex' }}
        >
          {getInitials(comment.user_name)}
        </div>
      </div>

      <div className="writer-comment-content">
        <div className="writer-comment-header">
          <div className="writer-comment-info">
            <span className="writer-comment-author">
              {comment.user_name}
              {comment.user_role === 'admin' && (
                <span className="writer-comment-badge admin">Admin</span>
              )}
              {comment.user_role === 'writer' && (
                <span className="writer-comment-badge writer">Penulis</span>
              )}
            </span>
            <span className="writer-comment-date">
              {formatDate(comment.created_at)}
              {comment.updated_at !== comment.created_at && (
                <span className="writer-comment-edited"> (diedit)</span>
              )}
            </span>
          </div>

          {canModify && (
            <div className="writer-comment-options">
              <button
                className="writer-comment-options-button"
                onClick={toggleOptions}
                aria-label="Comment options"
              >
                <FaEllipsisV />
              </button>

              {showOptions && (
                <div className="writer-comment-options-menu">
                  <button onClick={handleEditClick}>
                    <FaEdit /> Edit
                  </button>
                  <button onClick={handleDeleteClick}>
                    <FaTrash /> Hapus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <CommentForm
            onSubmit={onUpdate}
            initialValue={comment.content}
            buttonText="Simpan"
            onCancel={onCancelEdit}
            isEditing={true}
          />
        ) : (
          <div className="writer-comment-text">
            {comment.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
