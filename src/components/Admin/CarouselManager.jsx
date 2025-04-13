import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import './CarouselManager.css';

const CarouselManager = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    button_text: 'Selengkapnya',
    active: true,
    image: null,
    image_url: ''
  });
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch all slides
  const fetchSlides = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/carousel/admin');
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

  useEffect(() => {
    fetchSlides();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file' && files[0]) {
      // Handle image upload
      setFormData({
        ...formData,
        image: files[0]
      });

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(files[0]);
    } else if (type === 'checkbox') {
      // Handle checkbox
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      // Handle other inputs
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Open modal for creating new slide
  const handleAddSlide = () => {
    setEditingSlide(null);
    setFormData({
      title: '',
      description: '',
      link: '',
      button_text: 'Selengkapnya',
      active: true,
      image: null,
      image_url: ''
    });
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  // Open modal for editing slide
  const handleEditSlide = (slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description || '',
      link: slide.link || '',
      button_text: slide.button_text || 'Selengkapnya',
      active: slide.active === 1,
      image: null,
      image_url: slide.image_url
    });
    setPreviewImage(getImageUrl(slide.image_url));
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('link', formData.link);
      formDataToSend.append('button_text', formData.button_text);
      formDataToSend.append('active', formData.active ? 1 : 0);

      if (formData.image) {
        formDataToSend.append('image', formData.image);
      } else if (formData.image_url && !editingSlide) {
        formDataToSend.append('image_url', formData.image_url);
      }

      let response;

      if (editingSlide) {
        // Update existing slide
        response = await api.put(`/api/carousel/${editingSlide.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data && response.data.success) {
          toast.success('Slide berhasil diperbarui');
        }
      } else {
        // Create new slide
        response = await api.post('/api/carousel', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data && response.data.success) {
          toast.success('Slide baru berhasil dibuat');
        }
      }

      // Close modal and refresh slides
      setIsModalOpen(false);
      fetchSlides();
    } catch (err) {
      console.error('Error saving slide:', err);
      toast.error('Terjadi kesalahan saat menyimpan slide');
    } finally {
      setLoading(false);
    }
  };

  // Handle slide deletion
  const handleDeleteSlide = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus slide ini?')) {
      try {
        setLoading(true);
        const response = await api.delete(`/api/carousel/${id}`);

        if (response.data && response.data.success) {
          toast.success('Slide berhasil dihapus');
          fetchSlides();
        } else {
          toast.error('Gagal menghapus slide');
        }
      } catch (err) {
        console.error('Error deleting slide:', err);
        toast.error('Terjadi kesalahan saat menghapus slide');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle slide reordering with manual up/down buttons
  const moveSlide = async (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === slides.length - 1)
    ) {
      return; // Tidak bisa memindahkan slide pertama ke atas atau slide terakhir ke bawah
    }

    try {
      setLoading(true);

      const newSlides = [...slides];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Tukar posisi slide
      [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];

      // Update sort_order untuk semua slide
      const updatedSlidesOrder = newSlides.map((slide, idx) => ({
        id: slide.id,
        sort_order: idx
      }));

      // Kirim ke API
      const response = await api.post('/api/carousel/order', { slides: updatedSlidesOrder });

      if (response.data && response.data.success) {
        setSlides(newSlides);
        toast.success('Urutan slide berhasil diperbarui');
      } else {
        toast.error('Gagal memperbarui urutan slide');
        fetchSlides(); // Refresh dari server jika gagal
      }
    } catch (err) {
      console.error('Error updating slide order:', err);
      toast.error('Terjadi kesalahan saat memperbarui urutan slide');
      fetchSlides(); // Refresh dari server jika gagal
    } finally {
      setLoading(false);
    }
  };

  // Toggle slide active status
  const toggleSlideActive = async (slide) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/carousel/${slide.id}`, {
        active: slide.active === 1 ? 0 : 1
      });

      if (response.data && response.data.success) {
        toast.success(`Slide berhasil ${slide.active === 1 ? 'dinonaktifkan' : 'diaktifkan'}`);
        fetchSlides();
      } else {
        toast.error('Gagal mengubah status slide');
      }
    } catch (err) {
      console.error('Error toggling slide active status:', err);
      toast.error('Terjadi kesalahan saat mengubah status slide');
    } finally {
      setLoading(false);
    }
  };

  if (loading && slides.length === 0) {
    return <div className="writer-carousel-manager-loading">Memuat...</div>;
  }

  if (error) {
    return <div className="writer-carousel-manager-error">{error}</div>;
  }

  return (
    <div className="writer-carousel-manager">
      <div className="writer-carousel-manager-header">
        <h2>Kelola Carousel</h2>
        <button
          className="writer-carousel-add-button"
          onClick={handleAddSlide}
          disabled={loading}
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Tambah Slide
        </button>
      </div>

      {slides.length === 0 ? (
        <div className="writer-carousel-manager-empty">
          Belum ada slide carousel. Klik "Tambah Slide" untuk membuat slide baru.
        </div>
      ) : (
        <div className="writer-carousel-slides-list">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`writer-carousel-slide-item ${!slide.active ? 'inactive' : ''}`}
            >
              <div className="writer-carousel-slide-drag">
                <div className="writer-carousel-slide-drag-icon">
                  <button
                    onClick={() => moveSlide(index, 'up')}
                    disabled={index === 0}
                    className="writer-carousel-move-button"
                    title="Pindah ke atas"
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSlide(index, 'down')}
                    disabled={index === slides.length - 1}
                    className="writer-carousel-move-button"
                    title="Pindah ke bawah"
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="writer-carousel-slide-image">
                <img
                  src={slide.image_url}
                  alt={slide.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/150x80?text=No+Image';
                  }}
                />
              </div>

              <div className="writer-carousel-slide-content">
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
                {slide.link && (
                  <div className="writer-carousel-slide-link">
                    Link: {slide.link}
                  </div>
                )}
              </div>

              <div className="writer-carousel-slide-actions">
                <button
                  className="writer-carousel-action-button toggle-button"
                  onClick={() => toggleSlideActive(slide)}
                  title={slide.active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {slide.active ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>

                <button
                  className="writer-carousel-action-button edit-button"
                  onClick={() => handleEditSlide(slide)}
                  title="Edit"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>

                <button
                  className="writer-carousel-action-button delete-button"
                  onClick={() => handleDeleteSlide(slide.id)}
                  title="Hapus"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing slides */}
      {isModalOpen && (
        <div className="writer-carousel-modal-overlay">
          <div className="writer-carousel-modal">
            <div className="writer-carousel-modal-header">
              <h3>{editingSlide ? 'Edit Slide' : 'Tambah Slide Baru'}</h3>
              <button
                className="writer-carousel-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="writer-carousel-form">
              <div className="writer-carousel-form-group">
                <label htmlFor="title">Judul</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="writer-carousel-form-group">
                <label htmlFor="description">Deskripsi</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="writer-carousel-form-group">
                <label htmlFor="link">Link (opsional)</label>
                <input
                  type="text"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="Contoh: /about atau https://example.com"
                />
              </div>

              <div className="writer-carousel-form-group">
                <label htmlFor="button_text">Teks Tombol</label>
                <input
                  type="text"
                  id="button_text"
                  name="button_text"
                  value={formData.button_text}
                  onChange={handleInputChange}
                  placeholder="Contoh: Selengkapnya"
                />
              </div>

              <div className="writer-carousel-form-group checkbox">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                <label htmlFor="active">Aktif</label>
              </div>

              <div className="writer-carousel-form-group">
                <label htmlFor="image">Gambar</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  onChange={handleInputChange}
                  accept="image/*"
                />
                {!formData.image && !editingSlide && (
                  <div className="writer-carousel-form-group">
                    <label htmlFor="image_url">atau URL Gambar</label>
                    <input
                      type="text"
                      id="image_url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                )}
              </div>

              {previewImage && (
                <div className="writer-carousel-image-preview">
                  <img src={previewImage} alt="Preview" />
                </div>
              )}

              <div className="writer-carousel-form-actions">
                <button
                  type="button"
                  className="writer-carousel-cancel-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="writer-carousel-submit-button"
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarouselManager;
