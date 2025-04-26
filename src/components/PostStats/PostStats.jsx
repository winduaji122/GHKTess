import React, { useState, useEffect } from 'react';
import { FaEye, FaComment, FaHeart, FaCalendarAlt, FaUser, FaLock } from 'react-icons/fa';
import { getPostStats } from '../../api/postApi';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import './PostStats.css';

/**
 * Komponen untuk menampilkan statistik post (views, comments, likes)
 * @param {Object} props - Props komponen
 * @param {string} props.postId - ID post
 * @param {boolean} props.compact - Tampilan compact (default: false)
 * @param {boolean} props.showAuthor - Tampilkan info author (default: false)
 * @param {boolean} props.showDate - Tampilkan tanggal (default: true)
 * @param {Object} props.author - Data author (opsional)
 * @param {string} props.publishDate - Tanggal publikasi (opsional)
 * @param {number} props.viewCount - Jumlah view (opsional)
 * @param {number} props.commentCount - Jumlah komentar (opsional)
 * @param {number} props.likeCount - Jumlah like (opsional)
 * @param {string} props.className - Class tambahan (opsional)
 */
const PostStats = ({
  postId,
  compact = false,
  showAuthor = false,
  showDate = true,
  author,
  publishDate,
  viewCount: initialViewCount,
  commentCount: initialCommentCount,
  likeCount: initialLikeCount,
  className = ''
}) => {
  const { isLoggedIn } = useAuth();
  const [stats, setStats] = useState({
    views: initialViewCount !== undefined ? initialViewCount : 0,
    comments: initialCommentCount !== undefined ? initialCommentCount : 0,
    likes: initialLikeCount !== undefined ? initialLikeCount : 0,
    loading: initialViewCount === undefined && initialCommentCount === undefined && initialLikeCount === undefined,
    error: null
  });

  useEffect(() => {
    // Jika semua data sudah disediakan melalui props, tidak perlu fetch
    if (initialViewCount !== undefined &&
        initialCommentCount !== undefined &&
        initialLikeCount !== undefined) {
      return;
    }

    // Fetch statistik post jika postId tersedia dan user terautentikasi
    if (postId && isLoggedIn) {
      const fetchStats = async () => {
        try {
          const response = await getPostStats(postId);
          if (response.success) {
            setStats({
              views: response.data.views || 0,
              comments: response.data.commentCount || 0,
              likes: response.data.likeCount || 0,
              loading: false,
              error: null
            });
          } else {
            setStats(prev => ({
              ...prev,
              loading: false,
              error: response.message || 'Gagal mengambil statistik post'
            }));
          }
        } catch (error) {
          console.error('Error fetching post stats:', error);
          setStats(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Terjadi kesalahan saat mengambil statistik post'
          }));
        }
      };

      fetchStats();
    } else if (postId && !isLoggedIn) {
      // Jika user tidak terautentikasi, tampilkan pesan error
      setStats(prev => ({
        ...prev,
        loading: false,
        error: 'Login untuk melihat statistik post'
      }));
    }
  }, [postId, initialViewCount, initialCommentCount, initialLikeCount, isLoggedIn]);

  // Format tanggal relatif (misalnya "2 hari yang lalu")
  const formatRelativeDate = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Format tanggal lengkap (misalnya "12 April 2023")
  const formatFullDate = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Render komponen jika terjadi error
  if (stats.error && !isLoggedIn) {
    if (compact) {
      return (
        <div className={`post-stats-compact ${className}`}>
          <div className="post-stats-item post-stats-locked">
            <FaLock className="post-stats-icon" />
            <span>Login untuk melihat</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`post-stats ${className}`}>
        {showDate && publishDate && (
          <div className="post-stats-item post-stats-date">
            <FaCalendarAlt className="post-stats-icon" />
            <span title={formatFullDate(publishDate)}>
              {formatRelativeDate(publishDate)}
            </span>
          </div>
        )}

        {showAuthor && author && (
          <div className="post-stats-item post-stats-author">
            <FaUser className="post-stats-icon" />
            <span>{author.name}</span>
          </div>
        )}

        <div className="post-stats-item post-stats-locked">
          <FaLock className="post-stats-icon" />
          <span>Login untuk melihat statistik post</span>
        </div>
      </div>
    );
  }

  // Render komponen dalam mode compact
  if (compact) {
    return (
      <div className={`post-stats-compact ${className}`}>
        <div className="post-stats-item">
          <FaEye className="post-stats-icon" />
          <span>{stats.loading ? '...' : stats.views}</span>
        </div>
        <div className="post-stats-item">
          <FaComment className="post-stats-icon" />
          <span>{stats.loading ? '...' : stats.comments}</span>
        </div>
        <div className="post-stats-item">
          <FaHeart className="post-stats-icon" />
          <span>{stats.loading ? '...' : stats.likes}</span>
        </div>
      </div>
    );
  }

  // Render komponen dalam mode normal
  return (
    <div className={`post-stats ${className}`}>
      {showDate && publishDate && (
        <div className="post-stats-item post-stats-date">
          <FaCalendarAlt className="post-stats-icon" />
          <span title={formatFullDate(publishDate)}>
            {formatRelativeDate(publishDate)}
          </span>
        </div>
      )}

      {showAuthor && author && (
        <div className="post-stats-item post-stats-author">
          <FaUser className="post-stats-icon" />
          <span>{author.name}</span>
        </div>
      )}

      <div className="post-stats-item post-stats-views">
        <FaEye className="post-stats-icon" />
        <span>{stats.loading ? '...' : stats.views} views</span>
      </div>

      <div className="post-stats-item post-stats-comments">
        <FaComment className="post-stats-icon" />
        <span>{stats.loading ? '...' : stats.comments} komentar</span>
      </div>

      <div className="post-stats-item post-stats-likes">
        <FaHeart className="post-stats-icon" />
        <span>{stats.loading ? '...' : stats.likes} suka</span>
      </div>
    </div>
  );
};

export default PostStats;
