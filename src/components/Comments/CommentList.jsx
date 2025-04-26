import React from 'react';
import CommentItem from './CommentItem';
import './Comments.css';

const CommentList = ({ 
  comments, 
  currentUser, 
  onEdit, 
  editingComment, 
  onUpdate, 
  onDelete,
  onCancelEdit
}) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="writer-comment-empty">
        <p>Belum ada komentar. Jadilah yang pertama berkomentar!</p>
      </div>
    );
  }

  return (
    <div className="writer-comment-list">
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUser={currentUser}
          isEditing={editingComment === comment.id}
          onEdit={() => onEdit(comment.id)}
          onUpdate={(content) => onUpdate(comment.id, content)}
          onDelete={() => onDelete(comment.id)}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </div>
  );
};

export default CommentList;
