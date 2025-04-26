import React from 'react';
import LazyImage from './common/LazyImage';
import '../styles/lazyImage.css';

function PostList({ posts }) {
  return (
    <div>
      {posts.map(post => (
        <div key={post.postId}>
          <h3>{post.postTitle}</h3>
          <p>{post.date} {post.category}</p>
          {post.imageSrc && (
            <LazyImage
              src={post.imageSrc}
              alt={post.postTitle}
              height="200px"
              width="100%"
              objectFit="cover"
            />
          )}
          {/* Tambahkan elemen lain sesuai kebutuhan */}
        </div>
      ))}
    </div>
  );
}

export default PostList;