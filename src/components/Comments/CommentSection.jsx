import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCommentsByPostId, addComment, updateComment, deleteComment } from '../../api/commentApi';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import './Comments.css';
import { toast } from 'react-toastify';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const CommentSection = ({ postId, allowComments = true, onCommentAdded, onCommentDeleted, onCommentsLoaded }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [showComments, setShowComments] = useState(false); // State untuk mengontrol tampilan komentar (default: tersembunyi)
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Fungsi untuk memuat komentar
  const fetchComments = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const response = await getCommentsByPostId(postId);
      if (response.success) {
        const commentsData = response.data.comments || [];
        setComments(commentsData);

        // Panggil callback untuk memberitahu jumlah komentar ke parent component
        if (onCommentsLoaded && typeof onCommentsLoaded === 'function') {
          onCommentsLoaded(commentsData.length);
        }
      } else {
        setError('Gagal memuat komentar');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Terjadi kesalahan saat memuat komentar');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // Memuat komentar saat komponen dimount atau postId berubah
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Fungsi untuk menambahkan komentar baru
  const handleAddComment = async (content) => {
    if (!isLoggedIn) {
      // Redirect ke halaman login jika belum login
      navigate('/login', { state: { from: window.location.pathname + window.location.search } });
      return;
    }

    try {
      const response = await addComment(postId, content);
      if (response.success) {
        // Tambahkan komentar baru ke state
        setComments(prevComments => [response.data, ...prevComments]);
        toast.success('Komentar berhasil ditambahkan');
        // Panggil callback jika ada
        if (onCommentAdded) onCommentAdded();
      } else {
        toast.error('Gagal menambahkan komentar');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Terjadi kesalahan saat menambahkan komentar');
    }
  };

  // Fungsi untuk mengedit komentar
  const handleEditComment = async (commentId, content) => {
    try {
      const response = await updateComment(commentId, content);
      if (response.success) {
        // Update komentar di state
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId ? response.data : comment
          )
        );
        setEditingComment(null);
        toast.success('Komentar berhasil diperbarui');
      } else {
        toast.error('Gagal memperbarui komentar');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Terjadi kesalahan saat memperbarui komentar');
    }
  };

  // Fungsi untuk menghapus komentar
  const handleDeleteComment = async (commentId) => {
    try {
      const response = await deleteComment(commentId);
      if (response.success) {
        // Hapus komentar dari state
        setComments(prevComments =>
          prevComments.filter(comment => comment.id !== commentId)
        );
        toast.success('Komentar berhasil dihapus');
        // Panggil callback jika ada
        if (onCommentDeleted) onCommentDeleted();
      } else {
        toast.error('Gagal menghapus komentar');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Terjadi kesalahan saat menghapus komentar');
    }
  };

  // Jika komentar tidak diizinkan, tampilkan pesan
  if (!allowComments) {
    return (
      <div className="writer-comments-disabled">
        <p>Komentar dinonaktifkan untuk post ini.</p>
      </div>
    );
  }

  // Fungsi untuk toggle tampilan komentar
  const toggleComments = () => {
    setShowComments(prev => !prev);
  };

  return (
    <div className="writer-comment-section">
      <div className="writer-comment-header">
        <h3 className="writer-comment-section-title">
          Komentar
        </h3>
        <button
          className="writer-comment-toggle-button"
          onClick={toggleComments}
          aria-label={showComments ? "Sembunyikan komentar" : "Tampilkan komentar"}
        >
          {showComments ? (
            <>
              <FaChevronUp /> <span>Sembunyikan komentar</span>
            </>
          ) : (
            <>
              <FaChevronDown /> <span>{comments.length > 0 ? `${comments.length} Komentar` : 'Komentar'}</span>
            </>
          )}
        </button>
      </div>

      {/* Tampilkan satu komentar sebagai preview saat komentar disembunyikan */}
      {!showComments && (
        loading ? (
          <div className="writer-comment-loading writer-comment-loading-compact">
            <div className="writer-comment-loading-spinner"></div>
            <p>Memuat komentar...</p>
          </div>
        ) : error ? (
          <div className="writer-comment-error writer-comment-error-compact">
            <p>{error}</p>
            <button onClick={fetchComments}>Coba Lagi</button>
          </div>
        ) : (
        <div className="writer-comment-preview">
          {comments.length > 0 ? (
            <>
              <CommentList
                comments={[comments[0]]} // Hanya tampilkan komentar pertama
                currentUser={user}
                onEdit={setEditingComment}
                editingComment={editingComment}
                onUpdate={handleEditComment}
                onDelete={handleDeleteComment}
                onCancelEdit={() => setEditingComment(null)}
              />
              {comments.length > 1 && (
                <div
                  className="writer-comment-more-indicator"
                  onClick={toggleComments}
                >
                  <span>Lihat {comments.length - 1} komentar lainnya</span>
                </div>
              )}
            </>
          ) : (
            <div className="writer-comment-empty">
              <p>Belum ada komentar. Jadilah yang pertama berkomentar!</p>
            </div>
          )}
        </div>
        )
      )}

      {showComments && (
        <>
          {isLoggedIn ? (
            <CommentForm
              onSubmit={handleAddComment}
              initialValue=""
              buttonText="Kirim Komentar"
              placeholder="Tulis komentar Anda di sini..."
            />
          ) : (
            <div className="writer-comment-login-prompt">
              <p>Silakan <button onClick={() => navigate('/login', { state: { from: window.location.pathname + window.location.search } })}>login</button> untuk menambahkan komentar.</p>
            </div>
          )}

          {loading ? (
            <div className="writer-comment-loading">
              <div className="writer-comment-loading-spinner"></div>
              <p>Memuat komentar...</p>
            </div>
          ) : error ? (
            <div className="writer-comment-error">
              <p>{error}</p>
              <button onClick={fetchComments}>Coba Lagi</button>
            </div>
          ) : (
            <CommentList
              comments={comments}
              currentUser={user}
              onEdit={setEditingComment}
              editingComment={editingComment}
              onUpdate={handleEditComment}
              onDelete={handleDeleteComment}
              onCancelEdit={() => setEditingComment(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CommentSection;
