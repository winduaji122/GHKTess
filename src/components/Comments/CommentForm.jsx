import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaPaperPlane, FaTimes, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../contexts/AuthContext';
import { getValidProfileUrl } from '../../utils/profileHelper';
import { getInitials } from '../../utils/avatarHelper';
import './Comments.css';

const CommentForm = ({
  onSubmit,
  initialValue = '',
  buttonText = 'Kirim',
  placeholder = 'Tulis komentar...',
  onCancel = null,
  isEditing = false
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const { user } = useAuth();

  // Fungsi untuk menangani klik di luar emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fungsi untuk menambahkan emoji ke komentar
  const onEmojiClick = (emojiData) => {
    setContent(prevContent => prevContent + emojiData.emoji);
  };

  // Update content when initialValue changes (for editing)
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit(content);
      if (!isEditing) {
        setContent(''); // Clear form only if not editing
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mendapatkan URL profil yang valid
  const profilePicture = useMemo(() => {
    if (!user || !user.profile_picture) return null;
    console.log('CommentForm - Original profile picture:', user.profile_picture);
    return getValidProfileUrl(user.profile_picture);
  }, [user]);

  // Render avatar pengguna
  const renderUserAvatar = () => {
    if (!user) return null;

    return (
      <div className="writer-comment-avatar">
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={`${user.name}'s avatar`}
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
          {getInitials(user.name)}
        </div>
      </div>
    );
  };

  return (
    <form className="writer-comment-form" onSubmit={handleSubmit}>
      <div className="writer-comment-form-container">
        {renderUserAvatar()}

        <div className="writer-comment-form-input-container">
          <textarea
            className="writer-comment-form-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            disabled={isSubmitting}
            required
          />

          <div className="writer-comment-form-toolbar">
            <button
              type="button"
              className="writer-comment-emoji-button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSubmitting}
            >
              <FaSmile />
            </button>

            {showEmojiPicker && (
              <div className="writer-comment-emoji-picker" ref={emojiPickerRef}>
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={300}
                  height={400}
                  previewConfig={{ showPreview: false }}
                  searchDisabled={false}
                />
              </div>
            )}
          </div>

          <div className="writer-comment-form-buttons">
            <button
              type="submit"
              className="writer-comment-form-submit"
              disabled={isSubmitting || !content.trim()}
            >
              <FaPaperPlane />
              <span>{isSubmitting ? 'Mengirim...' : buttonText}</span>
            </button>

            {onCancel && (
              <button
                type="button"
                className="writer-comment-form-cancel"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <FaTimes />
                <span>Batal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
