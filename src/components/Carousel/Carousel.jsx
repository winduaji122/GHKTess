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
import '../../styles/lazyImage.css';

// Konstanta untuk caching
const CAROUSEL_CACHE_KEY = 'carousel_slides';
const CAROUSEL_CACHE_EXPIRY = 5 * 60 * 1000; // 5 menit dalam milidetik

const Carousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fungsi untuk menangani klik pada slide carousel - menggunakan useCallback untuk optimasi
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
    }
  }, [navigate]);

  // Fungsi untuk mengambil data carousel dengan caching yang dioptimalkan
  const fetchCarouselSlides = useCallback(async (bypassCache = false) => {
    try {
      // Hanya set loading jika tidak ada slides yang ditampilkan
      if (slides.length === 0) {
        setLoading(true);
      }

      // Cek cache terlebih dahulu jika tidak bypass
      if (!bypassCache) {
        try {
          const cachedData = localStorage.getItem(CAROUSEL_CACHE_KEY);
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            const now = Date.now();

            // Gunakan cache jika belum kedaluwarsa
            if (now - timestamp < CAROUSEL_CACHE_EXPIRY && data && data.length > 0) {
              setSlides(data);
              setLoading(false);
              return;
            }
          }
        } catch (cacheError) {
          // Tangani error cache tanpa mengganggu alur utama
          localStorage.removeItem(CAROUSEL_CACHE_KEY);
        }
      }

      // Jika tidak ada cache atau cache kedaluwarsa, ambil data baru
      const response = await api.get('/api/carousel', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 5000 // Tingkatkan timeout menjadi 5 detik
      });

      if (response.data && response.data.success) {
        // Filter slide yang aktif dan valid
        const activeSlides = response.data.slides
          .filter(slide => slide && slide.active !== false)
          .map(slide => ({
            ...slide,
            // Pastikan id selalu ada untuk optimasi rendering
            id: slide.id || `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          }));

        // Simpan ke cache hanya jika ada slides
        if (activeSlides.length > 0) {
          try {
            localStorage.setItem(CAROUSEL_CACHE_KEY, JSON.stringify({
              data: activeSlides,
              timestamp: Date.now()
            }));
          } catch (storageError) {
            // Tangani error storage tanpa mengganggu alur utama
          }

          setSlides(activeSlides);
          setError(null); // Reset error jika berhasil
        } else {
          // Jika tidak ada slides aktif, gunakan cache jika ada
          const cachedData = localStorage.getItem(CAROUSEL_CACHE_KEY);
          if (cachedData) {
            try {
              const { data } = JSON.parse(cachedData);
              if (data && data.length > 0) {
                setSlides(data);
                return;
              }
            } catch (parseError) {
              // Tangani error parsing tanpa mengganggu alur utama
            }
          }

          setSlides([]);
        }
      } else {
        setError('Gagal memuat slide carousel');

        // Gunakan cache jika ada error
        const cachedData = localStorage.getItem(CAROUSEL_CACHE_KEY);
        if (cachedData) {
          try {
            const { data } = JSON.parse(cachedData);
            if (data && data.length > 0) {
              setSlides(data);
              return;
            }
          } catch (parseError) {
            // Tangani error parsing tanpa mengganggu alur utama
          }
        }

        setSlides([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat slide carousel');

      // Coba gunakan cache jika ada error, bahkan jika sudah kedaluwarsa
      const cachedData = localStorage.getItem(CAROUSEL_CACHE_KEY);
      if (cachedData) {
        try {
          const { data } = JSON.parse(cachedData);
          if (data && data.length > 0) {
            setSlides(data);
            return;
          }
        } catch (parseError) {
          // Tangani error parsing tanpa mengganggu alur utama
        }
      }

      // Hanya set slides kosong jika tidak ada cache
      if (slides.length === 0) {
        setSlides([]);
      }
    } finally {
      setLoading(false);
    }
  }, [slides.length]);

  // Effect untuk memuat data carousel
  useEffect(() => {
    // Mulai fetch segera untuk carousel karena ini adalah komponen penting
    fetchCarouselSlides();

    // Buat interval untuk refresh data secara periodik
    const intervalId = setInterval(() => {
      fetchCarouselSlides(true); // Bypass cache untuk refresh periodik
    }, CAROUSEL_CACHE_EXPIRY);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchCarouselSlides]);

  // Memoize URL gambar dengan implementasi yang lebih efisien
  const getProcessedImageUrl = useCallback((slide) => {
    if (!slide || !slide.image_url) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      return `${apiUrl}/uploads/default-image.jpg`;
    }

    // Jika slide memiliki cached_url yang sudah diproses sebelumnya, gunakan langsung
    if (slide.cached_url) return slide.cached_url;

    // Gunakan fungsi getImageUrl dengan parameter yang benar
    const imageUrl = getImageUrl(slide.image_url, slide.image_source);

    // Cache URL yang sudah diproses ke dalam objek slide untuk penggunaan berikutnya
    slide.cached_url = imageUrl;

    return imageUrl;
  }, []);

  // Handler error gambar yang dioptimalkan
  const handleImageError = useCallback((e) => {
    if (!e || !e.target) return;

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Gunakan fallback image dan hapus handler error untuk mencegah loop
    e.target.src = `${apiUrl}/uploads/default-image.jpg`;
    e.target.onerror = null;
  }, []);

  // Render carousel item sebagai komponen terpisah dengan optimasi performa
  const CarouselItem = useCallback(({ slide, index }) => {
    // Pre-compute image URL untuk menghindari perhitungan berulang
    const imageUrl = getProcessedImageUrl(slide);

    return (
      <BootstrapCarousel.Item key={slide.id || index}>
        <div className="writer-carousel-image-container">
          <LazyImage
            src={imageUrl}
            alt={slide.title || 'Carousel slide'}
            className="writer-carousel-lazy-image"
            height="400px"
            width="100%"
            objectFit="cover"
            priority={index < 2} // Prioritaskan hanya 2 slide pertama untuk performa
            onError={handleImageError}
            customPlaceholder={
              <div className="writer-carousel-image-placeholder">
                <Skeleton height="400px" width="100%" enableAnimation={index < 2} />
              </div>
            }
          />
          <div className="writer-carousel-caption">
            <h3>{slide.title}</h3>
            <p>{slide.description}</p>
            <button
              onClick={() => handleSlideClick(slide)}
              className="writer-carousel-button"
            >
              {slide.button_text || 'Selengkapnya'}
            </button>
          </div>
        </div>
      </BootstrapCarousel.Item>
    );
  }, [getProcessedImageUrl, handleImageError, handleSlideClick]);

  // Render skeleton loader dengan optimasi performa
  if (loading && slides.length === 0) {
    return (
      <div className="writer-carousel-container">
        <div className="writer-carousel-skeleton">
          <Skeleton height={400} width="100%" enableAnimation={true} />
        </div>
      </div>
    );
  }

  // Jika ada error dan tidak ada slides, tampilkan pesan error
  if (error && slides.length === 0) {
    return <div className="writer-carousel-error">{error}</div>;
  }

  // Jika tidak ada slides, jangan tampilkan apa-apa
  if (!slides || slides.length === 0) {
    return null;
  }

  // Batasi jumlah slide untuk performa yang lebih baik
  const limitedSlides = slides.length > 5 ? slides.slice(0, 5) : slides;

  // Render carousel dengan slides yang sudah difilter dan dibatasi
  return (
    <div className="writer-carousel-container">
      <BootstrapCarousel
        slide={true}
        indicators={limitedSlides.length > 1} // Tampilkan indikator hanya jika ada lebih dari 1 slide
        controls={limitedSlides.length > 1} // Tampilkan kontrol hanya jika ada lebih dari 1 slide
        interval={5000}
        pause="hover" // Pause saat hover untuk UX yang lebih baik
        touch={true}
        wrap={true}
      >
        {limitedSlides.map((slide, index) => (
          <CarouselItem
            key={slide.id || `slide-${index}`}
            slide={slide}
            index={index}
          />
        ))}
      </BootstrapCarousel>
    </div>
  );
};

// Memoize komponen Carousel untuk mencegah render ulang yang tidak perlu
export default memo(Carousel);
