import React, { memo, useMemo } from 'react';
import moment from 'moment';
import AdminPostImage from './common/AdminPostImage.jsx';
import { stripHtmlTags } from '../utils/textUtils';
import PostStats from './PostStats';

// Komponen PostItem yang di-memoize untuk mencegah render ulang yang tidak perlu
const PostItem = memo(({
  post,
  isFeatured = false,
  user,
  getImageUrl,
  getLabelText,
  getStatusClass,
  getPostClassName,
  imageVersions,
  handleImageError,
  handleToggleFeatured,
  handleEdit,
  handleRestore,
  handlePermanentDelete,
  handleSoftDelete,
  ensurePostStatus,
  index = 0
}) => {
  if (!post) return null;

  // Pastikan post memiliki status yang valid
  const processedPost = ensurePostStatus(post);
  const labels = getLabelText(processedPost);

  // Fungsi handlePostClick untuk menangani klik pada post
  const handlePostClick = (e) => {
    // Jika click berasal dari area action buttons, jangan redirect
    if (e.target.closest('.admin-post-actions') ||
        e.target.closest('.post-actions') ||
        e.target.closest('button')) {
      return;
    }
    handleEdit(processedPost.id, e);
  };

  // Memoize image URL untuk mencegah render ulang yang tidak perlu
  const imageUrl = useMemo(() => {
    return getImageUrl(processedPost.image, processedPost.id);
  }, [processedPost.image, processedPost.id, getImageUrl, imageVersions[processedPost.id]]);

  // Memoize class name untuk mencegah render ulang yang tidak perlu
  const className = useMemo(() => {
    return `${getPostClassName(processedPost.id)} ${processedPost.deleted_at ? 'deleted' : ''}`;
  }, [processedPost.id, processedPost.deleted_at, getPostClassName]);

  return (
    <div
      className={className}
      onClick={handlePostClick}
    >
      <div className="admin-post-thumbnail">
        <AdminPostImage
          src={imageUrl}
          alt={`Gambar untuk postingan: ${processedPost.title}`}
          height="150px"
          width="150px"
          className="post-image"
          onError={() => handleImageError(processedPost.id)}
          fallbackSrc="/placeholder-image.jpg"
          index={index}
        />
        {isFeatured && <div className="admin-featured-label">FEATURED</div>}
      </div>
      <div className="admin-post-content">
        <div className="admin-post-info">
          <h3 className="admin-post-title">{processedPost.title}</h3>
          <div className="admin-post-meta">
            <span><i className="fas fa-calendar"></i> {moment(processedPost.created_at).format('DD/MM/YYYY')}</span>
            {processedPost.author_name && <span><i className="fas fa-user"></i> {processedPost.author_name}</span>}
            {labels && <span className="admin-post-labels">{labels}</span>}
            <div className={getStatusClass(processedPost.status)}>
              {processedPost.status || 'Draft'}
            </div>
          </div>
          {processedPost.content && (
            <div className="admin-post-excerpt">
              {stripHtmlTags(processedPost.content).substring(0, 120)}...
            </div>
          )}
          <PostStats
            postId={processedPost.id}
            compact={true}
            viewCount={processedPost.views !== undefined ? processedPost.views : 0}
            commentCount={processedPost.comments_count !== undefined ? processedPost.comments_count : 0}
            likeCount={processedPost.likes_count !== undefined ? processedPost.likes_count : 0}
            className="admin-post-stats"
          />
          {/* Author name sudah dipindahkan ke admin-post-meta */}
        </div>
      </div>
      {!processedPost.deleted_at && (
        <div className="admin-post-actions">
          {user && user.role === 'admin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFeatured(processedPost.id, processedPost.is_featured);
              }}
              className={`admin-featured-toggle ${processedPost.is_featured ? 'featured' : ''}`}
              title={processedPost.is_featured ? 'Hapus dari featured' : 'Jadikan featured'}
            >
              <i className={`fas fa-star ${processedPost.is_featured ? 'featured' : ''}`}></i>
            </button>
          )}
          {user && (
            <>
              {(user.role === 'admin' || processedPost.author_id === user.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(processedPost.id, e);
                  }}
                  title="Edit post"
                >
                  <i className="fas fa-edit"></i>
                </button>
              )}
            </>
          )}
        </div>
      )}
      <div className="post-actions">
        {user && user.role === 'admin' && (
          <>
            {processedPost.deleted_at ? (
              <div className="deleted-post-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(processedPost.id, e);
                  }}
                  className="restore-button"
                  title="Pulihkan post"
                >
                  <i className="fas fa-trash-restore"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePermanentDelete(processedPost.id, e);
                  }}
                  className="delete-permanent-button"
                  title="Hapus permanen"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSoftDelete(processedPost.id, e);
                }}
                className="soft-delete-button"
                title="Hapus sementara"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Nama tampilan untuk debugging
PostItem.displayName = 'PostItem';

export default PostItem;
