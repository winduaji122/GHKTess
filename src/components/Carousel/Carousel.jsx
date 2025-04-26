import React, { useState, useEffect } from 'react';
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

const Carousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fungsi untuk menangani klik pada slide carousel
  const handleSlideClick = (slide) => {
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
  };

  useEffect(() => {
    const fetchCarouselSlides = async () => {
      try {
        setLoading(true);
        // Tambahkan cache busting yang lebih agresif
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const response = await api.get(`/api/carousel?_t=${timestamp}&_r=${randomStr}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
            // Hapus header 'Expires' yang menyebabkan masalah CORS
          },
          timeout: 5000 // 5 detik timeout
        });

        if (response.data && response.data.success) {
          console.log('Carousel slides fetched:', response.data.slides);
          // Log detail untuk setiap slide untuk debugging
          response.data.slides.forEach((slide, index) => {
            console.log(`Slide ${index + 1} - ID: ${slide.id}`);
            console.log(`Title: ${slide.title}`);
            console.log(`Description: ${slide.description}`);
            console.log(`Post ID: ${slide.post_id}`);
            console.log('-------------------');
          });
          setSlides(response.data.slides);
        } else {
          console.error('Failed to fetch carousel slides:', response.data);
          setError('Gagal memuat slide carousel');
          // Gunakan fallback data jika tidak ada slide
          setSlides([]);
        }
      } catch (err) {
        console.error('Error fetching carousel slides:', err);
        setError('Terjadi kesalahan saat memuat slide carousel');
        // Gunakan fallback data jika terjadi error
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    // Gunakan setTimeout untuk menunda permintaan carousel
    const timeoutId = setTimeout(() => {
      fetchCarouselSlides();
    }, 500); // Delay 500ms untuk mengurangi permintaan bersamaan

    return () => clearTimeout(timeoutId);
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

  return (
    <div className="writer-carousel-container">
      <BootstrapCarousel
        slide={true}
        indicators={true} // Mengaktifkan indikator carousel
        controls={true}
        interval={5000} // Auto slide setiap 5 detik
        pause={false} // Tidak berhenti saat hover
        touch={true} // Mendukung swipe pada perangkat mobile
        wrap={true} // Carousel akan kembali ke awal setelah slide terakhir
      >
        {slides.filter(slide => slide.active !== false).map((slide, index) => (
          <BootstrapCarousel.Item key={slide.id || index}>
            <div className="writer-carousel-image-container">
              {/* Log untuk debugging */}
              {console.log('Carousel slide image:', {
                slide_id: slide.id,
                image_url: slide.image_url,
                image_source: slide.image_source,
                processed_url: getImageUrl(slide.image_url, slide.image_source),
                post_id: slide.post_id,
                post_title: slide.post_title,
                post_slug: slide.post_slug
              })}
              <LazyImage
                src={getImageUrl(slide.image_url, slide.image_source)}
                alt={slide.title}
                className="writer-carousel-lazy-image"
                height="400px"
                width="100%"
                objectFit="cover"
                onError={(e) => {
                  if (!e || !e.target) {
                    console.error('Error event or target is undefined');
                    return;
                  }

                  console.error('Image failed to load:', slide.image_url);
                  // Coba dengan URL alternatif jika gambar gagal dimuat
                  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

                  try {
                    if (slide.post_id && slide.image_source === 'regular') {
                      // Jika ini adalah slide dari regular post
                      if (slide.image_url) {
                        // Coba URL langsung ke file gambar
                        const fileName = slide.image_url.split('/').pop();
                        if (fileName) {
                          e.target.src = `${apiUrl}/uploads/${fileName}`;
                          console.log('Trying direct URL with filename:', `${apiUrl}/uploads/${fileName}`);
                          return;
                        }
                      }
                    } else if (slide.image_source === 'carousel') {
                      // Jika ini adalah slide dari carousel post
                      if (slide.image_url) {
                        // Coba URL dengan prefix uploads/carousel/
                        const fileName = slide.image_url.split('/').pop();
                        if (fileName) {
                          e.target.src = `${apiUrl}/uploads/carousel/${fileName}`;
                          console.log('Trying carousel URL:', `${apiUrl}/uploads/carousel/${fileName}`);
                          return;
                        }
                      }
                    }

                    // Fallback ke default image jika semua gagal
                    e.target.src = `${apiUrl}/uploads/default-image.jpg`;
                  } catch (error) {
                    console.error('Error in image error handler:', error);
                    // Fallback ke default image jika terjadi error
                    e.target.src = `${apiUrl}/uploads/default-image.jpg`;
                  }
                }}
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
        ))}
      </BootstrapCarousel>
    </div>
  );
};

export default Carousel;
