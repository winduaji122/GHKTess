import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicPostBySlug } from '../api/postApi';
import { FaFacebookF, FaWhatsapp, FaEnvelope, FaUser, FaCalendarAlt, FaTag } from 'react-icons/fa';
import './FullPostView.css';
import RelatedPostWidget from './RelatedPostWidget';
import { navigation } from '../config/navigation';
import NotFound from './NotFound';

function FullPostView() {
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { slugOrId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchPost = async () => {
      try {
        if (!slugOrId) {
          navigate('/404', { replace: true });
          return;
        }

        setLoading(true);
        setError(null);

        const postData = await getPublicPostBySlug(slugOrId);

        if (!isMounted) return;

        if (postData?.success && postData?.data) {
          const fetchedPost = postData.data;

          if (fetchedPost.slug && fetchedPost.slug !== slugOrId) {
            navigate(`/post/${fetchedPost.slug}`, { replace: true });
            return;
          }

          if (!Array.isArray(fetchedPost.labels)) {
            fetchedPost.labels = [];
          }

          if (!Array.isArray(fetchedPost.related_posts)) {
            fetchedPost.related_posts = [];
          }

          setPost(fetchedPost);
          setRelatedPosts(fetchedPost.related_posts || []);
        } else {
          throw new Error('Data post tidak valid');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching post:', err);
          setError(err);
          if (err.message === 'Post tidak ditemukan') {
            navigate('/404', { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [slugOrId, navigate]);

  const getImageUrl = useCallback((imagePath) => {
    if (!imagePath) return '/default-fallback-image.jpg';
    if (imagePath.startsWith('http')) return imagePath;

    // Fix double uploads in path
    if (imagePath.includes('/uploads/uploads/')) {
      imagePath = imagePath.replace('/uploads/uploads/', '/uploads/');
    }

    if (imagePath.startsWith('/uploads/')) return `${import.meta.env.VITE_API_BASE_URL}${imagePath}`;
    return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath}`;
  }, []);

  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = ['Gema Hati Kudus'];
    const path = window.location.pathname.split('/').filter(Boolean);

    if (path.length > 1) {
      const mainCategory = navigation.find(item => item.href.includes(path[0]));
      if (mainCategory) {
        breadcrumbs.push(mainCategory.name);

        if (path.length > 2) {
          const subCategory = mainCategory.children?.find(
            child => child.href.includes(path[1])
          );
          if (subCategory) {
            breadcrumbs.push(subCategory.name);
          }
        }
      }
    }

    return breadcrumbs;
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <NotFound error={error} />;
  if (!post) return null;

  const formattedDate = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Tanggal tidak tersedia';

  return (
    <div className="full-post-container">
      <div className="full-post-content">
        <div className="post-breadcrumbs">
          {getBreadcrumbs().map((crumb, index, array) => (
            <React.Fragment key={index}>
              <span className="breadcrumb-item">{crumb}</span>
              {index < array.length - 1 && <span className="breadcrumb-separator">&gt;</span>}
            </React.Fragment>
          ))}
        </div>
        <h1 className="post-title">{post.title}</h1>
        <div className="full-post-meta-container">
          <div className="full-post-meta">
            <span className="full-post-meta-item">
              <FaUser className="full-post-meta-icon" />
              <span className="full-post-author">
                {post.author?.name || post.author_name || 'Penulis tidak diketahui'}
              </span>
            </span>
            <span className="full-post-meta-item">
              <FaCalendarAlt className="full-post-meta-icon" />
              <span className="full-post-date">{formattedDate}</span>
            </span>
          </div>
          <div className="post-share">
            <button className="share-button facebook">
              <FaFacebookF /> <span>Share</span>
            </button>
            <button className="share-button whatsapp">
              <FaWhatsapp /> <span>Share</span>
            </button>
            <button className="share-button email">
              <FaEnvelope /> <span>Email</span>
            </button>
          </div>
        </div>
        <div className="post-image-container">
          <img
            src={getImageUrl(post.image)}
            alt={post.title}
            className="full-post-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-fallback-image.jpg';
            }}
          />
        </div>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {post?.labels?.length > 0 && (
          <div className="post-labels">
            <FaTag className="full-post-meta-icon" />
            {post.labels.map(label => (
              <span key={label.id} className="label">
                {label.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <aside className="full-post-sidebar">
        {relatedPosts.length > 0 && (
          <RelatedPostWidget relatedPosts={relatedPosts} />
        )}
      </aside>
    </div>
  );
}

export default FullPostView;
