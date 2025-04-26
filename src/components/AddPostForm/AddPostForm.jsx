import React, { Suspense, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getPostById } from '../../api/postApi';

// Components
import PostImage from './PostImage';
import PostFeatures from './PostFeatures';
import PostStatus from './PostStatus';
import PostLabels from './PostLabels';
import TagsInput from './TagsInput';
import CommentsToggle from './CommentsToggle';
import LoadingSpinner from '../LoadingSpinner';
// Hooks & Utils
import { usePostForm } from './hooks/usePostForm';
import { usePostImages } from './hooks/usePostImages';
import { usePostLabels } from './hooks/usePostLabels';
import { getQuillModules, getQuillFormats, getSubmitButtonText } from './utils/postHelper';
import { formatDateTimeForInput } from './utils/postFormatter';
import { validatePost } from './utils/postValidation';
import './AddPostForm.css';

const AddPostForm = ({ isEditing = false }) => {
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
    setHasChanges,
    handleTitleChange,
    handleContentChange,
    handleDateChange,
    handleStatusChange,
    handleFeaturedToggle,
    handleSpotlightToggle,
    handleTagsChange,
    handleCommentsToggle,
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

  // Custom hook untuk mengelola label
  const {
    labels,
    selectedLabels,
    showUndo,
    isLoadingLabels,
    handleLabelToggle,
    handleLabelCreate,
    handleLabelDelete,
    handleLabelEdit,
    handleUndo
  } = usePostLabels({
    initialSelectedLabels: post.labels?.map(l => typeof l === 'object' ? l.id : l) || [],
    onLabelsChange: (newSelectedLabels) => {
      // Log untuk debugging
      console.log('Label change triggered with:', newSelectedLabels);

      // Cari objek label yang sesuai dengan ID yang dipilih
      const selectedObjects = labels
        .filter(label => newSelectedLabels.includes(label.id))
        .map(label => ({
          id: label.id,
          label: label.label || label.name
        }));

      console.log('Selected label objects:', selectedObjects);

      // Update post dengan label yang dipilih
      setPost(prevPost => {
        const updatedPost = {
          ...prevPost,
          labels: selectedObjects
        };
        console.log('Updated post with new labels:', updatedPost);
        return updatedPost;
      });

      // Update hasChanges
      setHasChanges(prev => ({
        ...prev,
        labels: true
      }));
    }
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

  // Contoh penggunaan PostFeatures (digunakan di dalam return)

  // Gunakan useEffect untuk mengambil data post jika mode edit
  useEffect(() => {
    const fetchPost = async () => {
      if (isEditing && id) {
        try {
          const postData = await getPostById(id);
          console.log('Fetched post data:', postData);

          // Pastikan format label sesuai dengan yang diharapkan
          let formattedLabels = [];
          if (postData.labels && Array.isArray(postData.labels)) {
            formattedLabels = postData.labels.map(label => {
              // Pastikan label memiliki id sebagai number
              return {
                ...label,
                id: typeof label.id === 'string' ? parseInt(label.id) : label.id,
                label: label.label || label.name || ''
              };
            });
          }

          console.log('Formatted labels:', formattedLabels);

          setPost(prev => ({
            ...prev,
            ...postData,
            labels: formattedLabels,
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

    // Log khusus untuk labels
    if (post.labels && Array.isArray(post.labels)) {
      console.log('Current post labels:', post.labels);
      console.log('Label IDs:', post.labels.map(l => typeof l === 'object' ? l.id : l));
    }
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

  // Fungsi untuk validasi tanggal publikasi (digunakan di usePostForm)
  // Dipindahkan ke usePostForm.js untuk menghindari duplikasi

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
              onLabelEdit={handleLabelEdit}
              showUndo={showUndo}
              onUndo={handleUndo}
            />

            <div className="post-seo">
              <label htmlFor="post-tags">Tags SEO</label>
              <TagsInput
                value={post.tags || ''}
                onChange={handleTagsChange}
                placeholder="Tambahkan tag SEO (misal: berita, teknologi, tutorial)..."
              />
            </div>

            <CommentsToggle
              enabled={post.allow_comments}
              onChange={handleCommentsToggle}
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

      {/* Notifikasi undo sudah ditangani di dalam komponen PostLabels */}
    </div>
  );
};

export default React.memo(AddPostForm);