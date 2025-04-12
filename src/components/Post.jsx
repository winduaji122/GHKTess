import React from 'react';

function Post({ post }) {
  console.log('Rendering Post:', post);
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
        <p className="text-gray-600 mb-4">{post.content}</p>
        <div className="text-sm text-gray-500">
          <p>Author: {post.author}</p>
          <p>Created: {new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default Post;