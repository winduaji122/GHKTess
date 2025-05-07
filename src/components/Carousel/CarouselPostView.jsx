import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/axios';
import { apiUrl } from '../../api/Config';
import { getImageUrl, getResponsiveImageUrls } from '../../utils/imageHelper';
// import { stripHtmlTags } from '../../utils/textUtils';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Helmet } from 'react-helmet-async';
import ResponsivePostImage from '../common/ResponsivePostImage';
import './CarouselPostView.css';

// Fungsi untuk memformat tanggal
const formatDate = (dateString) => {
  if (!dateString) return '';

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return dateString; // Jika tanggal tidak valid

  return date.toLocaleDateString('id-ID', options);
};

const CarouselPostView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log(`Fetching carousel post with slug: ${slug}`);

        const response = await api.get(`/api/carousel-post/public/${slug}`, {
          params: {
            _t: Date.now() // Cache busting
          }
        });

        console.log('API Response:', response.data);

        if (response.data && response.data.success) {
          // Cek apakah ini adalah redirect ke post reguler
          if (response.data.redirect && response.data.redirectUrl) {
            console.log(`Redirecting to regular post: ${response.data.redirectUrl}`);
            navigate(response.data.redirectUrl);
            return;
          }

          if (response.data.post) {
            console.log('Carousel post data received:', response.data.post);
            console.log('Image URL:', response.data.post.image_url);
            console.log('Side Image URL:', response.data.post.side_image_url);
            setPost(response.data.post);
          } else {
            console.error('Post data missing in response:', response.data);
            setError('Post tidak ditemukan');
            navigate('/not-found');
          }
        } else {
          console.error('API response error:', response.data);
          setError('Post tidak ditemukan');
          navigate('/not-found');
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err.message || 'Terjadi kesalahan saat mengambil data post');

        if (err.response?.status === 404) {
          navigate('/not-found');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="carousel-post-loading">
        <div className="carousel-post-loading-header">
          <Skeleton height={30} width={120} style={{ marginBottom: '15px', borderRadius: '20px' }} />
          <Skeleton height={60} width="80%" style={{ marginBottom: '15px' }} />
          <Skeleton height={20} width="40%" style={{ marginBottom: '30px' }} />
        </div>
        <Skeleton height={400} style={{ marginBottom: '30px', borderRadius: '8px' }} />
        <Skeleton count={3} height={24} width="60%" style={{ marginBottom: '15px' }} />
        <Skeleton count={5} height={20} style={{ marginBottom: '10px' }} />
        <Skeleton count={3} height={20} style={{ marginBottom: '10px' }} />
        <Skeleton height={1} style={{ marginBottom: '20px', marginTop: '20px' }} />
        <Skeleton height={30} width={150} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="carousel-post-error">
        <h2>Terjadi Kesalahan</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="back-button">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Gema Hati Kudus</title>
        <meta name="description" content={post.excerpt || `Baca artikel ${post.title} di Gema Hati Kudus`} />
        <meta property="og:title" content={`${post.title} | Gema Hati Kudus`} />
        <meta property="og:description" content={post.excerpt || `Baca artikel ${post.title} di Gema Hati Kudus`} />
        {post.image_url && (
          <meta
            property="og:image"
            content={
              // Cek apakah image_url adalah UUID (format baru)
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.image_url)
                ? getResponsiveImageUrls(post.image_url).original
                : getImageUrl(post.image_url, 'carousel')
            }
          />
        )}
      </Helmet>

      {/* Hero Image - Full width */}
      {post.image_url && (
        <div className="carousel-post-hero-image">
          <ResponsivePostImage
            src={post.image_url}
            alt={post.title}
            width="100%"
            height="100%"
            objectFit="cover"
            priority={true}
            fallbackSrc={`${apiUrl}/uploads/default-image.jpg`}
            onError={() => {
              console.error('Failed to load hero image:', post.image_url);
            }}
          />
          <div className="carousel-post-hero-overlay">
            <div className="carousel-post-hero-content">
              <div className="carousel-post-badge">
                <span>Gema Hati Kudus</span>
              </div>
              <h1 className="carousel-post-title">{post.title}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="carousel-post-container">
        <div className="carousel-post-meta">
          <span className="carousel-post-date">{formatDate(post.publish_date || post.created_at)}</span>
          {post.author_name && (
            <span className="carousel-post-author">oleh {post.author_name}</span>
          )}
        </div>

        <div className="carousel-post-content-wrapper">
          <div className="carousel-post-content">
            <div
              className="carousel-post-body"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="carousel-post-footer">
              <Link to="/" className="carousel-post-back-button">
                &larr; Kembali ke Beranda
              </Link>
            </div>
          </div>

          {post.side_image_url && (
            <div className="carousel-post-side-image">
              <ResponsivePostImage
                src={post.side_image_url}
                alt={`${post.title} - gambar samping`}
                width="100%"
                height="100%"
                objectFit="cover"
                fallbackSrc={`${apiUrl}/uploads/default-image.jpg`}
                onError={() => {
                  console.error('Failed to load side image:', post.side_image_url);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CarouselPostView;
