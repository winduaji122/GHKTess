import React, { useState, useEffect, useCallback, memo } from 'react';
import { Carousel as BootstrapCarousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import LazyImage from '../common/LazyImage';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { getImageUrl } from '../../utils/imageHelper';
import './Carousel.css';
import './carousel-fix.css'; // Import CSS fix untuk transisi horizontal
import './carousel-performance.css'; // Import CSS untuk optimasi performa
import '../../styles/lazyImage.css';

// Preload gambar untuk meningkatkan performa
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No source provided'));
      return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
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

          // Preload gambar secara paralel
          const preloadPromises = limitedSlides.map(slide => {
            const imageUrl = getImageUrl(slide.image_url, slide.image_source);
            return preloadImage(imageUrl).catch(() => {
              // Jika gagal, coba URL alternatif
              const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
              if (slide.image_source === 'regular' && slide.image_url) {
                const fileName = slide.image_url.split('/').pop();
                if (fileName) {
                  return preloadImage(`${apiUrl}/uploads/${fileName}`);
                }
              } else if (slide.image_source === 'carousel' && slide.image_url) {
                const fileName = slide.image_url.split('/').pop();
                if (fileName) {
                  return preloadImage(`${apiUrl}/uploads/carousel/${fileName}`);
                }
              }
              return Promise.resolve(); // Resolve kosong jika semua gagal
            });
          });

          // Tunggu semua gambar preload (atau timeout setelah 3 detik)
          await Promise.race([
            Promise.all(preloadPromises),
            new Promise(resolve => setTimeout(resolve, 3000))
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
          <Skeleton height={400} width="100%" />
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
      >
        {slides.map((slide, index) => (
          <BootstrapCarousel.Item key={slide.id || index}>
            <div className="writer-carousel-image-container">
              <LazyImage
                src={getImageUrl(slide.image_url, slide.image_source)}
                alt={slide.title || 'Carousel slide'}
                className="writer-carousel-lazy-image"
                height="400px"
                width="100%"
                objectFit="cover"
                priority={index < 2} // Prioritaskan hanya 2 slide pertama
                loading={index < 2 ? "eager" : "lazy"} // Gunakan eager loading hanya untuk slide pertama
                decoding="async" // Gunakan async decoding untuk performa
                fetchpriority={index === 0 ? "high" : "auto"} // Prioritas tinggi untuk slide pertama
                onError={(e) => {
                  if (!e || !e.target) return;

                  // Coba dengan URL alternatif jika gambar gagal dimuat
                  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

                  try {
                    // Tentukan jenis gambar dan coba URL alternatif
                    let fallbackUrl = null;

                    if (slide.image_url) {
                      const fileName = slide.image_url.split('/').pop();
                      if (fileName) {
                        if (slide.image_source === 'regular') {
                          fallbackUrl = `${apiUrl}/uploads/${fileName}`;
                        } else if (slide.image_source === 'carousel') {
                          fallbackUrl = `${apiUrl}/uploads/carousel/${fileName}`;
                        }
                      }
                    }

                    // Gunakan fallback URL atau default image
                    e.target.src = fallbackUrl || `${apiUrl}/uploads/default-image.jpg`;
                  } catch (error) {
                    // Fallback ke default image jika terjadi error
                    e.target.src = `${apiUrl}/uploads/default-image.jpg`;
                  }
                }}
                customPlaceholder={
                  <div className="writer-carousel-image-placeholder">
                    <Skeleton height="400px" width="100%" enableAnimation={false} />
                  </div>
                }
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
        ))}
      </BootstrapCarousel>
    </div>
  );
};

// Memoize komponen Carousel untuk mencegah render ulang yang tidak perlu
export default memo(Carousel);
