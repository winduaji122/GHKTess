import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/axios';
import { apiUrl } from '../../api/Config';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { getImageUrl } from '../../utils/imageHelper';
import './AddCarouselPost.css';

// Konfigurasi editor Quill
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link', 'image',
  'align'
];

const AddCarouselPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    button_text: 'Baca Artikel',
    active: true,
    image: null,
    image_url: '',
    side_image: null,
    side_image_url: '',
    publish_date: new Date().toISOString().slice(0, 16),
    sort_order: 0
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [previewSideImage, setPreviewSideImage] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mainImageInputRef = useRef(null);
  const sideImageInputRef = useRef(null);

  // State untuk menandai apakah ini adalah carousel post dari regular post
  const [isFromRegularPost, setIsFromRegularPost] = useState(false);

  // If editing, fetch existing carousel post data
  useEffect(() => {
    if (id) {
      setIsEditing(true);
      const fetchCarouselPostData = async () => {
        try {
          setLoading(true);
          console.log(`Fetching carousel post with ID: ${id}`);

          // Cek apakah ID adalah UUID atau numerik
          // UUID biasanya memiliki format seperti: 87fa9f10-196f-4a3a-9b82-de6fa6b2bc17
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

          let finalId = id;
          let slideData = null;

          // Jika ID bukan UUID, coba cari slide dengan ID numerik dan dapatkan post_id-nya
          if (!isUuid && !isNaN(id)) {
            console.log(`ID ${id} is not a UUID, checking if it's a slide ID`);
            try {
              // Coba dapatkan slide dengan ID numerik
              const slideResponse = await api.get(`/api/carousel/${id}`);

              if (slideResponse.data && slideResponse.data.success && slideResponse.data.slide) {
                slideData = slideResponse.data.slide;
                if (slideData.post_id) {
                  finalId = slideData.post_id;
                  console.log(`Found slide with ID ${id}, using post ID: ${finalId}`);

                  // Cek apakah ini dari regular post
                  if (slideData.image_source === 'regular') {
                    setIsFromRegularPost(true);
                    console.log('This is a slide from regular post');
                  }
                }
              }
            } catch (slideErr) {
              console.error('Error fetching slide:', slideErr);
              // Lanjutkan dengan ID asli jika gagal mendapatkan slide
            }
          }

          // Jika ini adalah slide dari regular post, kita perlu mendapatkan data post dari API regular post
          if (isFromRegularPost && slideData) {
            try {
              const regularPostResponse = await api.get(`/api/posts/${finalId}`);

              if (regularPostResponse.data && regularPostResponse.data.post) {
                const regularPost = regularPostResponse.data.post;
                console.log('Regular post data received:', regularPost);

                setFormData({
                  title: slideData.title || regularPost.title || '',
                  content: regularPost.content || '',
                  excerpt: slideData.description || regularPost.excerpt || '',
                  button_text: slideData.button_text || 'Baca Artikel',
                  active: slideData.active === 1,
                  image: null,
                  image_url: regularPost.image || regularPost.featured_image || regularPost.image_url || '',
                  side_image: null,
                  side_image_url: '',
                  publish_date: regularPost.publish_date ? new Date(regularPost.publish_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                  sort_order: slideData.sort_order || 0,
                  uuid: finalId, // Simpan UUID asli untuk digunakan saat update
                  slideId: id, // Simpan ID slide untuk digunakan saat update
                  isFromRegularPost: true
                });

                if (regularPost.image || regularPost.featured_image || regularPost.image_url) {
                  setPreviewImage(getImageUrl(regularPost.image || regularPost.featured_image || regularPost.image_url, 'regular'));
                }

                setLoading(false);
                return; // Keluar dari fungsi karena data sudah diambil
              }
            } catch (regularPostErr) {
              console.error('Error fetching regular post:', regularPostErr);
              // Lanjutkan dengan mencoba API carousel post jika gagal
            }
          }

          // Tambahkan token ke header untuk autentikasi
          const response = await api.get(`/api/carousel-post/id/${finalId}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            params: {
              _t: Date.now() // Cache busting
            }
          });

          if (response.data && response.data.success) {
            console.log('Carousel post data received:', response.data);
            const slide = response.data.post;
            setFormData({
              title: slide.title || '',
              content: slide.content || '',
              excerpt: slide.excerpt || '',
              button_text: slide.button_text || 'Baca Artikel',
              active: slide.active === 1,
              image: null,
              image_url: slide.image_url || '',
              side_image: null,
              side_image_url: slide.side_image_url || '',
              publish_date: slide.publish_date ? new Date(slide.publish_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
              sort_order: slide.sort_order || 0,
              uuid: slide.id, // Simpan UUID asli untuk digunakan saat update
              slideId: slideData ? slideData.id : null // Simpan ID slide jika ada
            });

            // Simpan ID asli untuk digunakan saat update
            console.log(`Storing original UUID: ${slide.id}`);

            if (slide.image_url) {
              setPreviewImage(getImageUrl(slide.image_url, 'carousel'));
            }

            if (slide.side_image_url) {
              setPreviewSideImage(getImageUrl(slide.side_image_url, 'carousel'));
            }
          } else {
            console.error('Carousel post not found:', response.data);
            toast.error('Carousel post tidak ditemukan');
            navigate('/admin/posts', { state: { activeTab: 'carousel' } });
          }
        } catch (err) {
          console.error('Error fetching carousel post:', err);
          toast.error(`Terjadi kesalahan: ${err.response?.status === 404 ? 'Carousel post tidak ditemukan' : 'Gagal mengambil data'}`);
          navigate('/admin/posts', { state: { activeTab: 'carousel' } });
        } finally {
          setLoading(false);
        }
      };

      fetchCarouselPostData();
    }
  }, [id, navigate, apiUrl, isFromRegularPost]);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file' && files[0]) {
      // Handle image upload based on input name
      if (name === 'image') {
        setFormData({
          ...formData,
          image: files[0]
        });

        // Create preview URL for main image
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(files[0]);
      } else if (name === 'side_image') {
        setFormData({
          ...formData,
          side_image: files[0]
        });

        // Create preview URL for side image
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewSideImage(reader.result);
        };
        reader.readAsDataURL(files[0]);
      }
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

  const handleContentChange = (content) => {
    setFormData({
      ...formData,
      content
    });

    // Auto-generate excerpt if empty
    if (!formData.excerpt.trim()) {
      const textContent = content.replace(/<[^>]+>/g, '');
      const excerpt = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
      setFormData(prevData => ({
        ...prevData,
        excerpt
      }));
    }
  };

  const handleMainImageUploadClick = () => {
    mainImageInputRef.current.click();
  };

  const handleSideImageUploadClick = () => {
    sideImageInputRef.current.click();
  };

  const handleRemoveMainImage = () => {
    setPreviewImage(null);
    setFormData({
      ...formData,
      image: null,
      image_url: ''
    });
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = '';
    }
  };

  const handleRemoveSideImage = () => {
    setPreviewSideImage(null);
    setFormData({
      ...formData,
      side_image: null,
      side_image_url: ''
    });
    if (sideImageInputRef.current) {
      sideImageInputRef.current.value = '';
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    setFormData({
      ...formData,
      publish_date: formattedDate
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi form
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Judul harus diisi';
    }

    if (!formData.isFromRegularPost && !formData.content.trim()) {
      errors.content = 'Konten harus diisi';
    }

    if (!formData.isFromRegularPost && !previewImage && !formData.image_url) {
      errors.image = 'Gambar utama harus diisi';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Silakan perbaiki kesalahan pada form');
      return;
    }

    try {
      setIsSubmitting(true);
      setLoading(true);

      // Jika ini adalah carousel post dari regular post, kita hanya perlu memperbarui slide
      if (formData.isFromRegularPost && formData.slideId) {
        console.log(`Updating slide from regular post with ID: ${formData.slideId}`);

        // Hanya kirim data yang perlu diperbarui
        const slideData = {
          description: formData.excerpt,
          button_text: formData.button_text,
          active: formData.active ? 1 : 0
        };

        const response = await api.put(`/api/carousel/${formData.slideId}`, slideData);

        if (response.data && response.data.success) {
          toast.success('Slide dari regular post berhasil diperbarui');
          navigate('/admin/posts', { state: { activeTab: 'slides' } });
          return;
        }
      } else {
        // Proses normal untuk carousel post biasa
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('content', formData.content);
        formDataToSend.append('excerpt', formData.excerpt);
        formDataToSend.append('button_text', formData.button_text);
        formDataToSend.append('active', formData.active ? 1 : 0);
        formDataToSend.append('publish_date', formData.publish_date);
        formDataToSend.append('sort_order', formData.sort_order);

        // Append main image if exists
        if (formData.image) {
          formDataToSend.append('image', formData.image);
        } else if (formData.image_url && !isEditing) {
          formDataToSend.append('image_url', formData.image_url);
        }

        // Append side image if exists
        if (formData.side_image) {
          formDataToSend.append('side_image', formData.side_image);
        } else if (formData.side_image_url && !isEditing) {
          formDataToSend.append('side_image_url', formData.side_image_url);
        }

        let response;

        if (isEditing) {
          // Update existing carousel post
          // Pastikan ID yang digunakan adalah UUID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          const updateId = isUuid ? id : formData.uuid || id;

          console.log(`Updating carousel post with ID: ${updateId}`);

          response = await api.put(`/api/carousel-post/${updateId}`, formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (response.data && response.data.success) {
            toast.success('Carousel post berhasil diperbarui');
          }
        } else {
          // Create new carousel post
          response = await api.post('/api/carousel-post', formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (response.data && response.data.success) {
            toast.success('Carousel post baru berhasil dibuat');
          }
        }

        // Navigate back to carousel tab in admin/posts
        navigate('/admin/posts', { state: { activeTab: 'carousel' } });
      }
    } catch (err) {
      console.error('Error saving carousel post:', err);
      toast.error('Terjadi kesalahan saat menyimpan carousel post');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="carousel-post-form-loading">
        <Skeleton height={50} width="60%" style={{ marginBottom: '20px' }} />
        <Skeleton height={30} width="40%" style={{ marginBottom: '15px' }} />
        <Skeleton height={400} style={{ marginBottom: '20px' }} />
        <Skeleton count={5} height={20} style={{ marginBottom: '10px' }} />
      </div>
    );
  }

  return (
    <div className="carousel-post-form-container">
      <div className="carousel-post-form-header">
        <h2>{isEditing ? 'Edit Carousel Post' : 'Buat Carousel Post Baru'}</h2>
        <p>Buat konten khusus untuk carousel yang akan ditampilkan di halaman carousel post</p>
      </div>

      <form onSubmit={handleSubmit} className="carousel-post-form">
        <div className="carousel-post-form-main">
          <div className="carousel-post-form-section">
            <div className="carousel-post-form-group">
              <label htmlFor="title">Judul Post</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Masukkan judul post"
                className={formErrors.title ? 'error' : ''}
                required
                disabled={formData.isFromRegularPost}
              />
              {formErrors.title && <div className="error-message">{formErrors.title}</div>}
              {formData.isFromRegularPost && <small className="form-text text-muted">Judul tidak dapat diubah karena ini adalah post dari regular post.</small>}
            </div>

            <div className="carousel-post-form-group">
              <label htmlFor="content">Konten Post</label>
              {formData.isFromRegularPost ? (
                <div className="carousel-post-readonly-content">
                  <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                  <div className="carousel-post-readonly-overlay">
                    <div className="carousel-post-readonly-message">
                      Konten tidak dapat diubah karena ini adalah post dari regular post.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ReactQuill
                    value={formData.content}
                    onChange={handleContentChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Tulis konten post di sini..."
                    className={formErrors.content ? 'error' : ''}
                  />
                  {formErrors.content && <div className="error-message">{formErrors.content}</div>}
                </>
              )}
            </div>

            <div className="carousel-post-form-group">
              <label htmlFor="excerpt">Ringkasan (Excerpt)</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                placeholder="Ringkasan singkat dari post (akan otomatis diisi jika kosong)"
                rows="3"
              />
              <small>
                {formData.isFromRegularPost
                  ? 'Ini adalah satu-satunya bidang yang dapat diubah untuk post dari regular post. Maksimal 150 karakter.'
                  : 'Maksimal 150 karakter. Akan ditampilkan di halaman utama dan hasil pencarian.'}
              </small>
            </div>
          </div>
        </div>

        <div className="carousel-post-form-sidebar">
          <div className="carousel-post-form-section">
            <h3>Informasi Post</h3>

            <div className="carousel-post-form-group">
              <label htmlFor="publish_date">Tanggal Publikasi</label>
              <div className="carousel-post-date-input">
                <input
                  type="datetime-local"
                  id="publish_date"
                  name="publish_date"
                  value={formData.publish_date}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="carousel-post-today-button"
                  onClick={handleSetToday}
                >
                  Hari Ini
                </button>
              </div>
            </div>

            <div className="carousel-post-form-group">
              <label htmlFor="button_text">Teks Tombol</label>
              <input
                type="text"
                id="button_text"
                name="button_text"
                value={formData.button_text}
                onChange={handleInputChange}
                placeholder="Contoh: Baca Artikel"
              />
            </div>

            <div className="carousel-post-form-group checkbox">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
              />
              <label htmlFor="active">Aktif</label>
            </div>
          </div>

          <div className="carousel-post-form-section">
            <h3>Gambar Utama</h3>

            <div className="carousel-post-image-upload">
              {previewImage ? (
                <div className="carousel-post-image-preview">
                  <img src={previewImage} alt="Preview" />
                  {!formData.isFromRegularPost && (
                    <button
                      type="button"
                      className="carousel-post-remove-image"
                      onClick={handleRemoveMainImage}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`carousel-post-image-placeholder ${formData.isFromRegularPost ? 'disabled' : ''}`}
                  onClick={!formData.isFromRegularPost ? handleMainImageUploadClick : undefined}
                >
                  <PlusIcon className="w-8 h-8" />
                  <p>Klik untuk menambahkan gambar utama</p>
                </div>
              )}
              <input
                type="file"
                id="image"
                name="image"
                ref={mainImageInputRef}
                onChange={handleInputChange}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={formData.isFromRegularPost}
              />
              {formErrors.image && <div className="error-message">{formErrors.image}</div>}
            </div>

            <p className="carousel-post-image-help">
              {formData.isFromRegularPost
                ? 'Gambar utama tidak dapat diubah karena ini adalah post dari regular post.'
                : 'Gambar utama akan ditampilkan di carousel dan di bagian atas post. Ukuran yang direkomendasikan adalah 1920x1080 piksel.'}
            </p>
          </div>

          <div className="carousel-post-form-section">
            <h3>Gambar Samping (Opsional)</h3>

            {formData.isFromRegularPost ? (
              <div className="carousel-post-readonly-message">
                <p>Gambar samping tidak tersedia untuk post dari regular post.</p>
              </div>
            ) : (
              <>
                <div className="carousel-post-image-upload">
                  {previewSideImage ? (
                    <div className="carousel-post-image-preview">
                      <img src={previewSideImage} alt="Preview" />
                      <button
                        type="button"
                        className="carousel-post-remove-image"
                        onClick={handleRemoveSideImage}
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="carousel-post-image-placeholder"
                      onClick={handleSideImageUploadClick}
                    >
                      <PlusIcon className="w-8 h-8" />
                      <p>Klik untuk menambahkan gambar samping</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="side_image"
                    name="side_image"
                    ref={sideImageInputRef}
                    onChange={handleInputChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <p className="carousel-post-image-help">
                  Gambar samping akan ditampilkan di samping konten post. Ukuran yang direkomendasikan adalah 600x800 piksel.
                </p>
              </>
            )}
          </div>

          <div className="carousel-post-form-actions">
            <button
              type="button"
              className="carousel-post-cancel-button"
              onClick={() => navigate('/admin/posts', { state: { activeTab: 'carousel' } })}
            >
              Batal
            </button>
            <button
              type="submit"
              className="carousel-post-submit-button"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCarouselPost;
