import React, { useState, useEffect, useCallback, memo } from 'react';
import { Carousel as BootstrapCarousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import ResponsivePostImage from '../common/ResponsivePostImage';
import { getImageUrl, getResponsiveImageUrls } from '../../utils/imageHelper';
import './carousel-optimized.css'; // File CSS yang sudah dioptimasi

// Preload gambar untuk meningkatkan performa
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No source provided'));
      return;
    }

    // Cek apakah gambar sudah ada di cache browser
    if ('caches' in window) {
      caches.match(src).then(response => {
        if (response) {
          // Gambar sudah ada di cache, resolve langsung
          resolve(src);
          return;
        }

        // Gambar tidak ada di cache, lanjutkan dengan preload normal
        preloadWithImage();
      }).catch(() => {
        // Error saat mengecek cache, lanjutkan dengan preload normal
        preloadWithImage();
      });
    } else {
      // Cache API tidak tersedia, lanjutkan dengan preload normal
      preloadWithImage();
    }

    function preloadWithImage() {
      const img = new Image();

      // Tambahkan atribut untuk optimasi
      img.decoding = 'async';
      img.fetchPriority = 'high';
      img.importance = 'high'; // Untuk browser yang mendukung

      // Tambahkan event listener sebelum mengatur src
      img.onload = () => resolve(src);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

      // Atur src setelah event listener untuk menghindari race condition
      img.src = src;
    }
  });
};

const Carousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Memoize fungsi handleSlideClick untuk mencegah re-render yang tidak perlu
  const handleSlideClick = useCallback((slide) => {
    if (slide.link && slide.link.startsWith('/carousel-post/')) {
      // Jika link mengarah ke carousel post
      navigate(slide.link);
    } else if (slide.post_id && slide.post_slug) {
      // Jika slide terkait dengan post reguler
      navigate(`/post/${slide.post_slug}`);
    } else if (slide.link) {
      // Jika slide memiliki link kustom lainnya
      navigate(slide.link);
    } else {
      // Jika tidak ada link atau post, tidak melakukan apa-apa
      console.log('Slide tidak memiliki link atau post terkait');
    }
  }, [navigate]);



  useEffect(() => {
    // Gunakan AbortController untuk membatalkan permintaan jika komponen unmount
    const controller = new AbortController();

    const fetchCarouselSlides = async () => {
      try {
        setLoading(true);

        // Gunakan cache API browser jika tersedia
        const cacheKey = 'carousel-slides';
        let slidesData = null;

        // Coba ambil dari cache terlebih dahulu (jika browser mendukung)
        if ('caches' in window) {
          try {
            const cache = await caches.open('carousel-cache');
            const cachedResponse = await cache.match(cacheKey);

            if (cachedResponse) {
              const cachedData = await cachedResponse.json();
              // Gunakan cache jika belum kedaluwarsa (5 menit)
              if (cachedData.timestamp && (Date.now() - cachedData.timestamp < 5 * 60 * 1000)) {
                slidesData = cachedData.slides;
                console.log('Using cached carousel slides');
              }
            }
          } catch (cacheError) {
            console.warn('Cache API error:', cacheError);
          }
        }

        // Jika tidak ada cache yang valid, ambil dari API
        if (!slidesData) {
          // Tambahkan cache busting yang lebih agresif
          const timestamp = Date.now();
          const response = await api.get(`/api/carousel?_t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            timeout: 5000, // 5 detik timeout
            signal: controller.signal // Untuk membatalkan permintaan jika perlu
          });

          if (response.data && response.data.success) {
            slidesData = response.data.slides;

            // Simpan ke cache untuk penggunaan berikutnya
            if ('caches' in window) {
              try {
                const cache = await caches.open('carousel-cache');
                await cache.put(cacheKey, new Response(JSON.stringify({
                  slides: slidesData,
                  timestamp: Date.now()
                })));
              } catch (cacheError) {
                console.warn('Failed to cache carousel slides:', cacheError);
              }
            }
          } else {
            console.error('Failed to fetch carousel slides:', response.data);
            setError('Gagal memuat slide carousel');
            slidesData = [];
          }
        }

        // Preload gambar untuk mengurangi keterlambatan
        if (slidesData && slidesData.length > 0) {
          // Filter slide yang aktif
          const activeSlides = slidesData.filter(slide => slide.active !== false);

          // Batasi jumlah slide untuk performa
          const limitedSlides = activeSlides.slice(0, 5);

          // Preload gambar secara paralel - hanya preload 2 slide pertama untuk performa
          const slidesToPreload = limitedSlides.slice(0, 2);

          // Gunakan Promise.all dengan timeout untuk setiap gambar
          const preloadPromises = slidesToPreload.map(async (slide) => {
            try {
              // Buat timeout untuk setiap gambar (1.5 detik)
              let imageUrl;

              // Cek apakah image_url adalah UUID (format baru)
              const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidPattern.test(slide.image_url)) {
                // Gunakan getResponsiveImageUrls untuk mendapatkan URL gambar dengan berbagai ukuran
                const imageUrls = getResponsiveImageUrls(slide.image_url);
                // Gunakan ukuran medium untuk preload (lebih kecil, lebih cepat)
                imageUrl = imageUrls.medium;
              } else {
                // Gunakan getImageUrl untuk format lama
                imageUrl = getImageUrl(slide.image_url, slide.image_source);
              }

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Image preload timeout')), 1500)
              );

              // Race antara preload dan timeout
              await Promise.race([
                preloadImage(imageUrl),
                timeoutPromise
              ]);
            } catch (error) {
              // Jika gagal atau timeout, coba URL alternatif
              try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                if (slide.image_source === 'regular' && slide.image_url) {
                  const fileName = slide.image_url.split('/').pop();
                  if (fileName) {
                    await preloadImage(`${apiUrl}/uploads/${fileName}`);
                    return;
                  }
                } else if (slide.image_source === 'carousel' && slide.image_url) {
                  const fileName = slide.image_url.split('/').pop();
                  if (fileName) {
                    await preloadImage(`${apiUrl}/uploads/carousel/${fileName}`);
                    return;
                  }
                }
              } catch (fallbackError) {
                // Abaikan error pada fallback
              }
            }
          });

          // Tunggu semua gambar preload (atau timeout setelah 2 detik)
          await Promise.race([
            Promise.all(preloadPromises),
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);

          setSlides(limitedSlides);
        } else {
          setSlides([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching carousel slides:', err);
          setError('Terjadi kesalahan saat memuat slide carousel');
          setSlides([]);
        }
      } finally {
        setLoading(false);
      }
    };

    // Mulai fetch segera tanpa delay
    fetchCarouselSlides();

    return () => {
      // Batalkan permintaan jika komponen unmount
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="writer-carousel-container">
        <div className="writer-carousel-skeleton">
          {/* Gunakan div statis daripada Skeleton untuk performa lebih baik */}
          <div
            style={{
              height: "400px",
              width: "100%",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px"
            }}
          />
          {/* Tambahkan skeleton untuk caption untuk UX yang lebih baik */}
          <div className="writer-carousel-skeleton-caption">
            {/* Judul */}
            <div
              style={{
                height: "30px",
                width: "60%",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                borderRadius: "4px",
                marginBottom: '10px'
              }}
            />
            {/* Deskripsi */}
            <div
              style={{
                height: "20px",
                width: "80%",
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                borderRadius: "4px",
                marginBottom: '15px'
              }}
            />
            {/* Tombol */}
            <div
              style={{
                height: "36px",
                width: "120px",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                borderRadius: "18px"
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="writer-carousel-error">{error}</div>;
  }

  if (!slides || slides.length === 0) {
    return null; // Tidak menampilkan apa-apa jika tidak ada slide
  }

  // Render carousel dengan optimasi performa
  return (
    <div className="writer-carousel-container">
      <BootstrapCarousel
        slide={true}
        indicators={true}
        controls={true}
        interval={5000} // Auto slide setiap 5 detik
        pause="hover" // Berhenti saat hover untuk UX yang lebih baik
        touch={true} // Mendukung swipe pada perangkat mobile
        wrap={true} // Carousel akan kembali ke awal setelah slide terakhir
        fade={false} // Gunakan transisi slide horizontal untuk performa lebih baik
        keyboard={false} // Nonaktifkan keyboard navigation untuk mengurangi event listener
      >
        {slides.map((slide, index) => {
          // Tentukan apakah ini adalah slide yang perlu diprioritaskan
          const isPriority = index < 2;

          // Cek apakah image_url adalah UUID (format baru)
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isUuid = slide.image_url && uuidPattern.test(slide.image_url);

          // Precompute fallback URL untuk menghindari kalkulasi dalam onError
          const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          let fallbackUrl = null;

          if (!isUuid && slide.image_url) {
            const fileName = slide.image_url.split('/').pop();
            if (fileName) {
              if (slide.image_source === 'regular') {
                fallbackUrl = `${apiUrl}/uploads/${fileName}`;
              } else if (slide.image_source === 'carousel') {
                fallbackUrl = `${apiUrl}/uploads/carousel/${fileName}`;
              }
            }
          }

          // Optimasi onError handler
          const handleImageError = (e) => {
            if (!e || !e.target) return;
            e.target.src = fallbackUrl || `${apiUrl}/uploads/default-image.jpg`;
          };

          return (
            <BootstrapCarousel.Item key={slide.id || index}>
              <div className="writer-carousel-image-container">
                <ResponsivePostImage
                  src={slide.image_url}
                  alt={slide.title || 'Carousel slide'}
                  className="writer-carousel-lazy-image"
                  height="400px"
                  width="100%"
                  objectFit="cover"
                  priority={isPriority} // Prioritaskan hanya 2 slide pertama
                  size="medium" // Gunakan ukuran medium untuk carousel
                  onError={handleImageError}
                  fallbackSrc={fallbackUrl || `${apiUrl}/uploads/default-image.jpg`}
                />
                <div className="writer-carousel-caption">
                  <h3>{slide.title}</h3>
                  {slide.description && <p>{slide.description}</p>}
                  <button
                    onClick={() => handleSlideClick(slide)}
                    className="writer-carousel-button"
                    aria-label={`Lihat ${slide.title}`}
                  >
                    {slide.button_text || 'Selengkapnya'}
                  </button>
                </div>
              </div>
            </BootstrapCarousel.Item>
          );
        })}
      </BootstrapCarousel>
    </div>
  );
};

// Memoize komponen Carousel untuk mencegah render ulang yang tidak perlu
export default memo(Carousel);
