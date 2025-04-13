import React, { Suspense, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getPostById } from '../../api/postApi';
import moment from 'moment';

// Components
import PostImage from './PostImage';
import PostFeatures from './PostFeatures';
import PostStatus from './PostStatus';
import PostLabels from './PostLabels';
import LoadingSpinner from '../LoadingSpinner';
// Hooks & Utils
import { usePostForm } from './hooks/usePostForm';
import { usePostImages } from './hooks/usePostImages';
import { usePostLabels } from './hooks/usePostLabels';
import { getQuillModules, getQuillFormats, isFormValid, getSubmitButtonText } from './utils/postHelper';
import { formatDateTimeForInput } from './utils/postFormatter';
import { validatePost } from './utils/postValidation';
import './AddPostForm.css';

const AddPostForm = ({ isEditing = false, onAddPost, onUpdatePost }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Memoize quill config
  const quillModules = useMemo(() => getQuillModules, []);
  const quillFormats = useMemo(() => getQuillFormats, []);

  // Custom Hooks dengan destructuring yang lebih rapi
  const {
    post,
    setPost,
    isLoading,
    isSubmitting,
    hasChanges,
    setHasChanges,
    handleTitleChange,
    handleContentChange,
    handleDateChange,
    handleStatusChange,
    handleFeaturedToggle,
    handleSpotlightToggle,
    handleSubmit,
    titleInputRef,
    handleSetToday,
    formErrors
  } = usePostForm(isEditing, id, user?.role);

  const {
    uploadStatus,
    imagePreview,
    handleImageChange,
    handleRemoveImage
  } = usePostImages({
    setPost,
    setHasChanges,
    isEditing
  });

  const {
    labels,
    selectedLabels,
    showUndo,
    isLoadingLabels,
    handleLabelToggle,
    handleLabelCreate,
    handleLabelDelete,
    handleUndo
  } = usePostLabels({
    setPost,
    setHasChanges,
    initialLabels: post.labels || []
  });

  // Memoize validation
  const isValid = useMemo(() => {
    const validation = validatePost(post);
    return validation.isValid && !uploadStatus.isUploading;
  }, [post, uploadStatus.isUploading]);

  // Memoize submit button state
  const isSubmitDisabled = useMemo(() => {
    return !isValid || isSubmitting || uploadStatus.isUploading;
  }, [isValid, isSubmitting, uploadStatus.isUploading]);

  // Tambahkan useCallback untuk handler
  const handleSpotlightToggleCallback = useCallback((checked) => {
    console.log('Spotlight toggle clicked:', checked); // Debug log
    handleSpotlightToggle(checked);
  }, [handleSpotlightToggle]);

  // Gunakan di PostFeatures
  {user?.role === 'admin' && (
    <PostFeatures
      post={post}
      isAdmin={true}
      onFeaturedToggle={handleFeaturedToggle}
      onSpotlightToggle={handleSpotlightToggleCallback}
    />
  )}

  // Gunakan useEffect untuk mengambil data post jika mode edit
  useEffect(() => {
    const fetchPost = async () => {
      if (isEditing && id) {
        try {
          const postData = await getPostById(id);
          setPost(prev => ({
            ...prev,
            ...postData,
            publish_date: postData.publish_date
              ? formatDateTimeForInput(new Date(postData.publish_date))
              : formatDateTimeForInput(new Date(postData.created_at))
          }));
        } catch (error) {
          console.error('Error fetching post:', error);
          if (error.response?.status === 401) {
            navigate('/login');
          }
          toast.error('Gagal mengambil data post');
        }
      }
    };

    fetchPost();
  }, [isEditing, id, setPost, navigate]);

  useEffect(() => {
    // Debug log untuk melihat formData
    console.log('Current formData in AddPostForm:', post);
  }, [post]);

  useEffect(() => {
    console.log('AddPostForm Debug:', {
      isValid,
      isSubmitting,
      uploadStatus,
      user: {
        role: user?.role,
        is_approved: user?.is_approved,
      }
    });
  }, [isValid, isSubmitting, uploadStatus, user]);

  // Debugging useEffect
  useEffect(() => {
    console.log('AddPostForm User Approval Status:', {
      role: user?.role,
      is_approved: user?.is_approved,
      isApprovedBoolean: Boolean(user?.is_approved),
      isAdmin: user?.role === 'admin'
    });
  }, [user]);

  const validatePublishDate = (dateString) => {
    const publishDate = moment(dateString);
    const now = moment();

    if (!publishDate.isValid()) {
      return {
        isValid: false,
        message: 'Format tanggal tidak valid'
      };
    }

    if (publishDate.isBefore(now)) {
      return {
        isValid: false,
        message: `Tanggal harus ${now.format('DD/MM/YYYY HH:mm')} atau setelahnya`
      };
    }

    return {
      isValid: true,
      message: ''
    };
  };

  if (isLoading || isLoadingLabels) {
    return <LoadingSpinner />;
  }

  return (
    <div className="add-post-form">
      <form onSubmit={handleSubmit} className="post-form-container">
        <div className="editor-main">
          <input
            ref={titleInputRef}
            type="text"
            className="title-input"
            placeholder="Judul Post"
            value={post.title}
            onChange={handleTitleChange}
            required
            maxLength={255}
          />

          <div className="editor-container">
            <ReactQuill
              value={post.content}
              onChange={handleContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Tulis konten post di sini..."
            />
          </div>
        </div>

        <div className="sidebar-section">
          <div className="post-meta">
            <h3>Informasi Post</h3>

            <div className="post-date">
              <label htmlFor="publish-date">Tanggal Publikasi</label>
              <div className="date-input-group">
                <input
                  type="datetime-local"
                  id="publish-date"
                  name="publish_date"
                  value={post.publish_date || ''}
                  onChange={handleDateChange}
                  className={formErrors.publish_date ? 'error' : ''}
                />
                <button
                  type="button"
                  className="today-btn"
                  onClick={handleSetToday}
                >
                  Hari Ini
                </button>
              </div>
              {formErrors.publish_date && (
                <div className="error-message">{formErrors.publish_date}</div>
              )}
            </div>

            <Suspense fallback={<div>Loading image uploader...</div>}>
              <PostImage
                post={post}
                uploadStatus={uploadStatus}
                imagePreview={imagePreview}
                onImageChange={handleImageChange}
                onRemoveImage={handleRemoveImage}
              />
            </Suspense>

            {user?.role === 'admin' && (
              <PostFeatures
                post={post}
                isAdmin={true}
                onFeaturedToggle={handleFeaturedToggle}
                onSpotlightToggle={handleSpotlightToggleCallback}
              />
            )}

            <PostStatus
              status={post.status}
              onChange={handleStatusChange}
              isAdmin={user?.role === 'admin'}
              role={user?.role || 'writer'}
            />

            <PostLabels
              labels={labels}
              selectedLabels={selectedLabels}
              onLabelToggle={handleLabelToggle}
              onLabelCreate={handleLabelCreate}
              onLabelDelete={handleLabelDelete}
              showUndo={showUndo}
              onUndo={handleUndo}
            />

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`submit-btn ${isSubmitDisabled ? 'disabled' : ''}`}
            >
              {getSubmitButtonText(isEditing, uploadStatus.isUploading, isSubmitting)}
            </button>
          </div>
        </div>
      </form>

      {showUndo && (
        <div className="undo-notification">
          <span>Label telah dihapus</span>
          <button onClick={handleUndo} className="undo-btn">
            Batalkan
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(AddPostForm);