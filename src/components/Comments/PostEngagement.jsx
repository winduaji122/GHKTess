import React, { useState } from 'react';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import './Comments.css';

const PostEngagement = ({ postId, allowComments = true }) => {
  const [commentCount, setCommentCount] = useState(0);

  // Fungsi untuk menerima jumlah komentar dari CommentSection
  const handleCommentsLoaded = (count) => {
    setCommentCount(count);
  };

  return (
    <div className="writer-post-engagement">
      <LikeButton postId={postId} commentCount={commentCount} />
      <CommentSection
        postId={postId}
        allowComments={allowComments}
        onCommentAdded={() => setCommentCount(prev => prev + 1)}
        onCommentDeleted={() => setCommentCount(prev => prev - 1)}
        onCommentsLoaded={handleCommentsLoaded}
      />
    </div>
  );
};

export default PostEngagement;
