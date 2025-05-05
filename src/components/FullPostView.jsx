import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicPostBySlug, incrementViews } from '../api/postApi';
import { FaTags, FaHome, FaChevronRight, FaUser, FaCalendarAlt, FaFacebookF, FaWhatsapp, FaEnvelope, FaLink, FaTwitter } from 'react-icons/fa';
import './FullPostView.css';
import '../styles/lazyImage.css';
import LazyImage from './common/LazyImage';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import RelatedPostWidget from './RelatedPostWidget';
import NotFound from './NotFound';
import PostEngagement from './Comments/PostEngagement';
import { toast } from 'react-toastify';

function FullPostView() {
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State untuk menyimpan breadcrumbs
  const [breadcrumbItems, setBreadcrumbItems] = useState([
    { name: 'Gema Hati Kudus', path: '/', icon: <FaHome className="breadcrumb-icon" /> }
  ]);
  // State untuk tombol salin link
  const [copySuccess, setCopySuccess] = useState(false);

  const { slugOrId } = useParams();
  const navigate = useNavigate();
  // Buat ref di level atas komponen
  const viewCounted = useRef(false);

  // Fungsi untuk mengubah URL YouTube menjadi embed URL dengan autoplay - menggunakan useMemo
  const processContent = useMemo(() => {
    return (content) => {
      if (!content) return '';

      // Regex untuk mendeteksi iframe YouTube yang sudah ada
      const iframeYoutubeRegex = /<iframe[^>]*src=["'](?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[\?&][^"']*)?["'][^>]*><\/iframe>/g;

      // Proses iframe YouTube yang sudah ada
      let processedContent = content.replace(iframeYoutubeRegex, (match, videoId) => {
        // Jika iframe sudah memiliki autoplay, jangan ubah
        if (match.includes('autoplay=1')) return match;

        // Tambahkan autoplay=1 ke URL
        let updatedMatch = match.replace(`src="https://www.youtube.com/embed/${videoId}`, `src="https://www.youtube.com/embed/${videoId}?autoplay=1`);
        updatedMatch = updatedMatch.replace(`src='https://www.youtube.com/embed/${videoId}`, `src='https://www.youtube.com/embed/${videoId}?autoplay=1`);

        // Tambahkan atribut allow jika belum ada
        if (!updatedMatch.includes('allow=')) {
          updatedMatch = updatedMatch.replace('></iframe>', ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>');
        }

        // Tambahkan atribut allowfullscreen jika belum ada
        if (!updatedMatch.includes('allowfullscreen')) {
          updatedMatch = updatedMatch.replace('></iframe>', ' allowfullscreen></iframe>');
        }

        // Bungkus dalam div.video-container jika belum dibungkus
        if (!updatedMatch.includes('class="video-container"') && !updatedMatch.includes("class='video-container'")) {
          updatedMatch = `<div class="video-container">${updatedMatch}</div>`;
        }

        return updatedMatch;
      });

      return processedContent;
    };
  }, []);

  // Effect untuk increment views ketika post berubah
  useEffect(() => {
    if (post && post.id && !viewCounted.current) {
      viewCounted.current = true; // Tandai bahwa view sudah dihitung

      // Gunakan requestIdleCallback untuk menunda hingga browser idle
      const incrementViewCount = () => {
        incrementViews(post.id).catch(error => {
          // Hanya log error jika benar-benar diperlukan
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error incrementing views:', error);
          }
        });
      };

      // Gunakan requestIdleCallback jika tersedia, atau fallback ke setTimeout
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(incrementViewCount);
      } else {
        setTimeout(incrementViewCount, 1000);
      }
    }
  }, [post?.id]); // Hanya jalankan ketika post.id berubah

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

        // Tambahkan parameter timestamp untuk menghindari cache
        const timestamp = Date.now();
        const postData = await getPublicPostBySlug(slugOrId, { _t: timestamp });

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

          // Gunakan functional update untuk menghindari render yang tidak perlu
          setPost(prevPost => {
            // Jika post sebelumnya sama dengan post baru, tidak perlu update
            if (prevPost && prevPost.id === fetchedPost.id &&
                prevPost.updated_at === fetchedPost.updated_at) {
              return prevPost;
            }
            return fetchedPost;
          });

          setRelatedPosts(prevRelated => {
            // Jika related posts sebelumnya sama dengan yang baru, tidak perlu update
            if (prevRelated && prevRelated.length === (fetchedPost.related_posts || []).length) {
              return prevRelated;
            }
            return fetchedPost.related_posts || [];
          });

          // Tidak perlu memanggil incrementViews di sini karena sudah dipanggil di useEffect
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

  // Menggunakan useMemo untuk getImageUrl
  const getImageUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

    return (imagePath) => {
      if (!imagePath) return '/default-fallback-image.jpg';

      // Jika URL menggunakan localhost, ganti dengan URL produksi
      if (imagePath.startsWith('http') && imagePath.includes('localhost:5000')) {
        return imagePath.replace(/http:\/\/localhost:5000/g, apiUrl);
      }

      // Jika sudah URL lengkap lainnya, gunakan langsung
      if (imagePath.startsWith('http')) return imagePath;

      // Fix double uploads in path
      if (imagePath.includes('/uploads/uploads/')) {
        imagePath = imagePath.replace('/uploads/uploads/', '/uploads/');
      }

      if (imagePath.startsWith('/uploads/')) return `${apiUrl}${imagePath}`;
      return `${apiUrl}/uploads/${imagePath}`;
    };
  }, []);

  const getBreadcrumbs = useCallback(async () => {
    // Breadcrumb selalu dimulai dengan Home
    const breadcrumbs = [
      { name: 'Gema Hati Kudus', path: '/', icon: <FaHome className="breadcrumb-icon" /> }
    ];

    // Jika tidak ada post, kembalikan breadcrumb default
    if (!post) return breadcrumbs;

    // Jika post memiliki label
    if (post.labels && post.labels.length > 0) {
      // Cari label utama dan sublabel
      const subLabels = [];
      const mainLabels = [];

      // Kategorikan label berdasarkan informasi parent_id dan parent_label dari API
      post.labels.forEach(postLabel => {
        // Cek apakah label memiliki parent_id dan parent_label
        if (postLabel.parent_id && postLabel.parent_label) {
          // Ini adalah sublabel, tambahkan ke subLabels
          subLabels.push(postLabel);
        } else {
          // Ini adalah label utama
          mainLabels.push(postLabel);
        }
      });

      // Jika ada sublabel, prioritaskan sublabel pertama dan tampilkan parent labelnya
      if (subLabels.length > 0) {
        const primarySubLabel = subLabels[0];
        const subLabelName = primarySubLabel.name || primarySubLabel.label;

        // Cek apakah sublabel memiliki parent_label yang sudah kita tambahkan
        if (primarySubLabel.parent_label) {

          // Tambahkan parent label ke breadcrumb terlebih dahulu
          breadcrumbs.push({
            name: primarySubLabel.parent_label,
            path: `/label/${primarySubLabel.parent_label}`,
            icon: null
          });

          // Kemudian tambahkan sublabel
          breadcrumbs.push({
            name: subLabelName,
            path: `/label/${subLabelName}`,
            icon: null
          });



          return breadcrumbs;
        }

        // Tambahkan sublabel ke breadcrumb
        breadcrumbs.push({
          name: subLabelName,
          path: `/label/${subLabelName}`,
          icon: null
        });
      }
      // Jika tidak ada sublabel tapi ada label utama, gunakan label utama pertama
      else if (mainLabels.length > 0) {
        const primaryLabel = mainLabels[0];
        const labelName = primaryLabel.name || primaryLabel.label;

        breadcrumbs.push({
          name: labelName,
          path: `/label/${labelName}`,
          icon: null
        });
      }
      // Jika tidak ada label utama atau sublabel, gunakan label pertama apa adanya
      else {
        const primaryLabel = post.labels[0];
        const labelName = primaryLabel.name || primaryLabel.label;

        breadcrumbs.push({
          name: labelName,
          path: `/label/${labelName}`,
          icon: null
        });
      }
    } else {
      // Jika tidak ada label, gunakan 'Posts' sebagai fallback
      breadcrumbs.push({
        name: 'Posts',
        path: '/posts',
        icon: null
      });
    }



    return breadcrumbs;
  }, [post]);

  // Effect untuk memperbarui breadcrumbs ketika post berubah
  useEffect(() => {
    const updateBreadcrumbs = async () => {
      if (post) {
        try {
          const breadcrumbs = await getBreadcrumbs();
          setBreadcrumbItems(breadcrumbs);
        } catch (error) {
          console.error('Error updating breadcrumbs:', error);
          // Gunakan breadcrumb default jika terjadi error
          const defaultBreadcrumbs = [
            { name: 'Gema Hati Kudus', path: '/', icon: <FaHome className="breadcrumb-icon" /> },
            { name: 'Post', path: '/posts', icon: null }
          ];
          setBreadcrumbItems(defaultBreadcrumbs);
        }
      }
    };

    updateBreadcrumbs();
  }, [post, getBreadcrumbs]);

  // Memoize skeleton loader untuk mencegah re-render yang tidak perlu
  const SkeletonLoader = useMemo(() => (
    <div className="full-post-container">
      <div className="full-post-content">
        <Skeleton height={30} width={200} className="mb-2" />
        <Skeleton height={50} width="80%" className="mb-4" />
        <Skeleton height={20} width={150} count={2} className="mb-3" />
        <Skeleton height={400} className="mb-4" />
        <Skeleton height={20} count={10} className="mb-2" />
      </div>
      <div className="full-post-sidebar">
        <Skeleton height={400} className="mb-4" />
      </div>
    </div>
  ), []);

  if (loading) return SkeletonLoader;

  if (error) return <NotFound error={error} />;
  if (!post) return null;

  const formattedDate = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Tanggal tidak tersedia';

  // Fungsi untuk membuka popup sharing
  const openSharePopup = (url, title, width = 600, height = 400) => {
    // Menghitung posisi tengah
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    // Membuka popup
    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes`
    );

    // Fokus ke popup jika berhasil dibuka
    if (popup && popup.focus) {
      popup.focus();
    }

    return false; // Mencegah browser membuka link di tab baru
  };

  return (
    <div className="full-post-container">
      <div className="full-post-content">
        <nav aria-label="breadcrumb">
          <ol className="writer-breadcrumb">
            {breadcrumbItems.map((crumb, index, array) => (
              <li
                key={index}
                className={`writer-breadcrumb-item ${crumb.isActive ? 'active' : ''}`}
                title={crumb.name} // Menambahkan tooltip untuk judul yang panjang
              >
                {/* Semua item breadcrumb sebagai tombol dengan Link */}
                <Link
                  to={crumb.path || '#'}
                  className={index === array.length - 1 ? 'writer-breadcrumb-current' : ''}
                  onClick={(e) => {
                    // Hanya cegah navigasi jika tidak ada path
                    if (!crumb.path) {
                      e.preventDefault();
                    }
                  }}
                >
                  {crumb.icon} {crumb.name}
                </Link>
                {index < array.length - 1 && (
                  <span className="writer-breadcrumb-separator">
                    <FaChevronRight />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
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
            <button
              className="share-button facebook"
              aria-label="Bagikan ke Facebook"
              title="Bagikan ke Facebook"
              onClick={(e) => {
                e.preventDefault();
                // Gunakan URL yang Anda berikan
                const shareUrl = `https://www.facebook.com/sharer.php?u=${encodeURIComponent(window.location.href)}`;
                openSharePopup(shareUrl, 'Bagikan ke Facebook');
              }}
            >
              <FaFacebookF /> <span>Facebook</span>
            </button>
            <button
              className="share-button twitter"
              aria-label="Bagikan ke Twitter"
              title="Bagikan ke Twitter"
              onClick={(e) => {
                e.preventDefault();
                const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}&via=GemaHatiKudus&hashtags=GemaHatiKudus`;
                openSharePopup(shareUrl, 'Bagikan ke Twitter');
              }}
            >
              <FaTwitter /> <span>Twitter</span>
            </button>
            <button
              className="share-button whatsapp"
              aria-label="Bagikan ke WhatsApp"
              title="Bagikan ke WhatsApp"
              onClick={(e) => {
                e.preventDefault();
                const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('Baca artikel ini dari Gema Hati Kudus: "' + post.title + '" ' + window.location.href)}`;
                openSharePopup(shareUrl, 'Bagikan ke WhatsApp');
              }}
            >
              <FaWhatsapp /> <span>WhatsApp</span>
            </button>
            <button
              className="share-button email"
              aria-label="Bagikan via Email"
              title="Bagikan via Email"
              onClick={(e) => {
                e.preventDefault();
                const mailtoUrl = `mailto:?subject=${encodeURIComponent('Artikel dari Gema Hati Kudus: ' + post.title)}&body=Halo,%0A%0ASaya ingin berbagi artikel menarik dari Gema Hati Kudus dengan Anda:%0A%0A"${encodeURIComponent(post.title)}"%0A%0ABaca selengkapnya di: ${encodeURIComponent(window.location.href)}%0A%0ASalam,%0A${encodeURIComponent(post.author?.name || post.author_name || 'Pembaca Gema Hati Kudus')}`;
                // Untuk email, kita buka langsung karena popup tidak berfungsi dengan mailto:
                window.location.href = mailtoUrl;
              }}
            >
              <FaEnvelope /> <span>Email</span>
            </button>
            <button
              className={`share-button copy ${copySuccess ? 'copy-success' : ''}`}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                  .then(() => {
                    setCopySuccess(true);
                    toast.success('Link artikel berhasil disalin!', {
                      position: "top-center",
                      autoClose: 2000,
                      hideProgressBar: true,
                      closeOnClick: true,
                      pauseOnHover: false,
                      draggable: false,
                      icon: "📋",
                    });

                    // Reset status copy setelah 2 detik
                    setTimeout(() => {
                      setCopySuccess(false);
                    }, 2000);
                  })
                  .catch(err => {
                    console.error('Gagal menyalin link: ', err);
                    toast.error('Gagal menyalin link artikel', {
                      position: "top-center",
                      autoClose: 2000,
                      hideProgressBar: true,
                      closeOnClick: true,
                      pauseOnHover: false,
                      draggable: false,
                    });
                  });
              }}
              aria-label="Salin Link"
              title="Salin Link"
            >
              <FaLink /> <span>{copySuccess ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>
        </div>
        <div className="post-image-container">
          <LazyImage
            src={getImageUrl(post.image)}
            alt={post.title}
            className="full-post-image"
            height="auto"
            width="100%"
            objectFit="cover"
          />
        </div>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: processContent(post.content) }}
        />

        {post?.tags && post.tags.trim() !== '' && (
          <div className="post-metadata">
            <div className="post-tags">
              <div className="post-metadata-title">
                <FaTags className="post-metadata-icon" />
                <span>Tags</span>
              </div>
              <div className="post-tags-list">
                {post.tags.split(',').map((tag, index) => (
                  <span key={index} className="post-tag">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Post Engagement Section (Like and Comments) */}
        <PostEngagement postId={post.id} allowComments={post.allow_comments !== 0} />

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
