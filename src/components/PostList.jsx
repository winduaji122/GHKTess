import React from 'react';

function PostList({ posts }) {
  return (
    <div>
      {posts.map(post => (
        <div key={post.postId}>
          <h3>{post.postTitle}</h3>
          <p>{post.date} {post.category}</p>
          {post.imageSrc && (
            <img 
              src={post.imageSrc} 
              alt={post.postTitle}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/path/to/placeholder-image.jpg';
              }}
            />
          )}
          {/* Tambahkan elemen lain sesuai kebutuhan */}
        </div>
      ))}
    </div>
  );
}

export default PostList;