import React, { useState, useEffect } from 'react';
import { Carousel as BootstrapCarousel } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { api } from '../../api/axios';
import './Carousel.css';

const Carousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCarouselSlides = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/carousel');
        if (response.data && response.data.success) {
          console.log('Carousel slides fetched:', response.data.slides);
          setSlides(response.data.slides);
        } else {
          console.error('Failed to fetch carousel slides:', response.data);
          setError('Gagal memuat slide carousel');
        }
      } catch (err) {
        console.error('Error fetching carousel slides:', err);
        setError('Terjadi kesalahan saat memuat slide carousel');
      } finally {
        setLoading(false);
      }
    };

    fetchCarouselSlides();
  }, []);

  if (loading) {
    return <div className="writer-carousel-loading">Memuat carousel...</div>;
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
        fade
        indicators={true}
        controls={true}
        interval={5000} // Auto slide setiap 5 detik
        pause={false} // Tidak berhenti saat hover
      >
        {slides.filter(slide => slide.active !== false).map((slide, index) => (
          <BootstrapCarousel.Item key={slide.id || index}>
            <div
              className="writer-carousel-image"
              style={{ backgroundImage: `url(${slide.image_url})` }}
            >
              <div className="writer-carousel-caption">
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
                {slide.link && (
                  <Link to={slide.link} className="writer-carousel-button">
                    {slide.button_text || 'Selengkapnya'}
                  </Link>
                )}
              </div>
            </div>
          </BootstrapCarousel.Item>
        ))}
      </BootstrapCarousel>
    </div>
  );
};

export default Carousel;
