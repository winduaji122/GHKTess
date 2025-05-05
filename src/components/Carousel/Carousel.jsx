import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
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

  // Fungsi untuk mengambil data carousel dengan caching
  const fetchCarouselSlides = useCallback(async (bypassCache = false) => {
    try {
      setLoading(true);

      // Cek cache terlebih dahulu jika tidak bypass
      if (!bypassCache) {
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
      }

      // Jika tidak ada cache atau cache kedaluwarsa, ambil data baru
      const response = await api.get('/api/carousel', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 3000 // 3 detik timeout
      });

      if (response.data && response.data.success) {
        const activeSlides = response.data.slides.filter(slide => slide.active !== false);

        // Simpan ke cache
        localStorage.setItem(CAROUSEL_CACHE_KEY, JSON.stringify({
          data: activeSlides,
          timestamp: Date.now()
        }));

        setSlides(activeSlides);
      } else {
        setError('Gagal memuat slide carousel');
        setSlides([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat slide carousel');
      setSlides([]);

      // Coba gunakan cache jika ada error, bahkan jika sudah kedaluwarsa
      const cachedData = localStorage.getItem(CAROUSEL_CACHE_KEY);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        if (data && data.length > 0) {
          setSlides(data);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Memoize URL gambar untuk menghindari perhitungan berulang
  const getProcessedImageUrl = useCallback((slide) => {
    if (!slide || !slide.image_url) return null;
    return getImageUrl(slide.image_url, slide.image_source);
  }, []);

  // Handler error gambar yang disederhanakan
  const handleImageError = useCallback((e) => {
    if (!e || !e.target) return;

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Langsung gunakan fallback image
    e.target.src = `${apiUrl}/uploads/default-image.jpg`;
  }, []);

  // Render carousel item sebagai komponen terpisah untuk optimasi
  const CarouselItem = useCallback(({ slide, index }) => (
    <BootstrapCarousel.Item key={slide.id || index}>
      <div className="writer-carousel-image-container">
        <LazyImage
          src={getProcessedImageUrl(slide)}
          alt={slide.title || 'Carousel slide'}
          className="writer-carousel-lazy-image"
          height="400px"
          width="100%"
          objectFit="cover"
          priority={true} // Prioritaskan pemuatan gambar carousel
          onError={handleImageError}
          customPlaceholder={
            <div className="writer-carousel-image-placeholder">
              <Skeleton height="400px" width="100%" />
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
  ), [getProcessedImageUrl, handleImageError, handleSlideClick]);

  // Render skeleton loader
  if (loading && slides.length === 0) {
    return (
      <div className="writer-carousel-container">
        <div className="writer-carousel-skeleton">
          <Skeleton height={400} width="100%" />
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

  // Render carousel dengan slides yang sudah difilter
  return (
    <div className="writer-carousel-container">
      <BootstrapCarousel
        slide={true}
        indicators={true}
        controls={true}
        interval={5000}
        pause={false}
        touch={true}
        wrap={true}
      >
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id || index}
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
