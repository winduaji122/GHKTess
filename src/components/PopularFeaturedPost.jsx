import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPopularPosts } from '../api/postApi';
import ResponsivePostImage from './common/ResponsivePostImage';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './PopularFeaturedPost.css';

const PopularFeaturedPost = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fungsi untuk memperbaiki URL gambar dengan format lama
  const fixImageUrl = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    // Jika URL mengandung 'image-' (format lama), coba konversi ke UUID
    if (typeof imageUrl === 'string' && imageUrl.includes('image-')) {
      // Coba cari di database gambar berdasarkan nama file
      if (window.imageDatabase && Array.isArray(window.imageDatabase)) {
        const matchingImage = window.imageDatabase.find(img =>
          img.original_path.includes(imageUrl.split('/').pop())
        );

        if (matchingImage) {
          console.log('Found matching image in database:', matchingImage.id);
          return matchingImage.id;
        }
      }

      // Jika tidak ditemukan di database, gunakan URL asli
      return imageUrl;
    }

    return imageUrl;
  }, []);

  // Inisialisasi database gambar jika belum ada
  useEffect(() => {
    if (!window.imageDatabase && typeof window !== 'undefined') {
      // Coba ambil dari localStorage
      try {
        const cachedData = localStorage.getItem('imageDatabase');
        if (cachedData) {
          window.imageDatabase = JSON.parse(cachedData);
          console.log('PopularFeaturedPost: Loaded image database from localStorage:', window.imageDatabase.length, 'images');
        }
      } catch (error) {
        console.error('Error loading image database from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchPopularFeaturedPost = async () => {
      try {
        setLoading(true);
        const response = await getPopularPosts(1); // Ambil hanya 1 post terpopuler

        if (response.success && response.data.length > 0) {
          setPost(response.data[0]);
        } else {
          setError('Tidak ada artikel populer yang tersedia');
        }
      } catch (err) {
        console.error('Error fetching popular featured post:', err);
        setError('Terjadi kesalahan saat memuat artikel populer');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularFeaturedPost();
  }, []);

  if (loading) {
    return (
      <div className="writer-popular-featured">
        <h2 className="writer-popular-featured-title">Paling Populer</h2>
        <div className="writer-popular-featured-skeleton">
          <Skeleton height={200} />
          <Skeleton height={30} width="80%" style={{ marginTop: '10px' }} />
          <Skeleton height={20} width="60%" style={{ marginTop: '5px' }} />
          <Skeleton height={15} width="40%" style={{ marginTop: '5px' }} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return null;
  }

  return (
    <div className="writer-popular-featured">
      <h2 className="writer-popular-featured-title">Paling Populer</h2>
      <Link to={`/post/${post.slug}`} className="writer-popular-featured-link">
        <div className="writer-popular-featured-image">
          <ResponsivePostImage
            src={fixImageUrl(post.image)}
            alt={post.title}
            height="200px"
            width="100%"
            objectFit="cover"
            size="thumbnail" // Gunakan ukuran thumbnail untuk performa yang lebih baik
            onError={() => {
              console.error('Error loading popular post image:', post.image);
            }}
          />
          <div className="writer-popular-featured-views">
            <span>{post.views || 0} views</span>
          </div>
        </div>
        <h3 className="writer-popular-featured-post-title">{post.title}</h3>
        <p className="writer-popular-featured-excerpt">
          {post.excerpt ?
            (post.excerpt.length > 100 ? post.excerpt.substring(0, 100) + '...' : post.excerpt) :
            (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : '')}
        </p>
        <p className="writer-popular-featured-date">
          {new Date(post.publish_date || post.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </Link>
    </div>
  );
};

export default PopularFeaturedPost;
