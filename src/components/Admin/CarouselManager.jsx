import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { getAllPostsAdmin } from '../../api/postApi';
import LazyImage from '../common/LazyImage';
import '../../styles/lazyImage.css';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import './CarouselManager.css';

const CarouselManager = () => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [carouselPosts, setCarouselPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [activeTab, setActiveTab] = useState('slides');
  const [activeModalTab, setActiveModalTab] = useState('carousel');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    button_text: 'Selengkapnya',
    active: true,
    image: null,
    image_url: '',
    post_id: ''
  });
  const [posts, setPosts] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch all slides
  const fetchSlides = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/carousel/admin');
      if (response.data && response.data.success) {
        console.log('Carousel slides fetched:', response.data.slides);
        // Limit active slides to 5
        const activeSlides = response.data.slides.filter(slide => slide.active === 1);

        // If more than 5 active slides, set the rest to inactive
        if (activeSlides.length > 5) {
          const slidesToDeactivate = activeSlides.slice(5);
          for (const slide of slidesToDeactivate) {
            await api.put(`/api/carousel/${slide.id}`, { active: 0 });
          }
          toast.success('Hanya 5 slide yang dapat aktif. Slide lainnya dinonaktifkan.');
          // Refetch slides after deactivation
          const updatedResponse = await api.get('/api/carousel/admin');
          if (updatedResponse.data && updatedResponse.data.success) {
            setSlides(updatedResponse.data.slides);
          }
        } else {
          setSlides(response.data.slides);
        }
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

  // Fetch all carousel posts
  const fetchCarouselPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/carousel-post');
      if (response.data && response.data.success) {
        console.log('Carousel posts fetched:', response.data.posts);
        setCarouselPosts(response.data.posts);
      } else {
        console.error('Failed to fetch carousel posts:', response.data);
        setError('Gagal memuat post carousel');
      }
    } catch (err) {
      console.error('Error fetching carousel posts:', err);
      setError('Terjadi kesalahan saat memuat post carousel');
    } finally {
      setLoading(false);
    }
  };

  // State untuk menyimpan post carousel draft yang digunakan dalam slides
  const [draftPostsInSlides, setDraftPostsInSlides] = useState([]);

  useEffect(() => {
    fetchSlides();
    fetchCarouselPosts();
    fetchPosts();
  }, []);

  // Effect untuk memeriksa post carousel draft yang digunakan dalam slides
  useEffect(() => {
    if (slides.length > 0 && carouselPosts.length > 0) {
      // Cari post carousel dengan status draft yang digunakan dalam slides
      const draftPosts = carouselPosts.filter(post =>
        post.status === 'draft' &&
        slides.some(slide => slide.post_id === post.id)
      );

      setDraftPostsInSlides(draftPosts);
    }
  }, [slides, carouselPosts]);

  // Fetch all posts for selection
  const fetchPosts = async () => {
    try {
      const response = await getAllPostsAdmin({ status: 'published', page: 1, limit: 100 });
      if (response.success) {
        setPosts(response.data);
      } else {
        console.error('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

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

  // Handle add slide button click - now opens post selection modal
  const handleAddSlide = () => {
    setSelectedSlideId(null);
    setIsReplaceModalOpen(true);
  };

  // Handle replace slide button click
  const handleReplaceSlide = (slideId) => {
    setSelectedSlideId(slideId);
    setIsReplaceModalOpen(true);
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
      image_url: slide.image_url,
      post_id: slide.post_id || ''
    });
    setPreviewImage(getImageUrl(slide.image_url, slide.image_source));
    setIsModalOpen(true);
  };

  // Fungsi khusus untuk mengedit slide dari regular post
  const handleEditRegularPostSlide = (slide) => {
    setEditingSlide(slide);
    console.log('Editing slide from regular post:', slide);

    // Ambil data post dari API untuk mendapatkan informasi terbaru
    const fetchRegularPostData = async () => {
      try {
        setLoading(true);

        // Gunakan post_id dari slide untuk mengambil data post
        if (!slide.post_id) {
          throw new Error('Slide tidak memiliki post_id');
        }

        console.log('Fetching post data with ID:', slide.post_id);
        const response = await api.get(`/api/posts/${slide.post_id}`);
        console.log('API response for post:', response.data);

        // Periksa berbagai kemungkinan struktur respons
        let post = response.data.post || response.data;

        // Pastikan post adalah objek, bukan null atau undefined
        if (!post) {
          console.log('Post data is null or undefined, using empty object');
          post = {};
        }

        console.log('Post data structure:', post);

        // Set form data dengan data dari slide dan post
        const formDataObj = {
          title: slide.title || '',
          description: slide.description || (post.excerpt || ''),
          image_url: post.image || post.featured_image || post.image_url || slide.image_url || '',
          // Gunakan link dari slide, jangan ubah
          link: slide.link || '',
          button_text: slide.button_text || 'Baca Selengkapnya',
          active: slide.active === 1,
          post_id: slide.post_id,
          isFromRegularPost: true, // Tandai bahwa ini dari regular post
          regularPostData: post, // Simpan data post untuk referensi
          slideId: slide.id // Simpan ID slide untuk digunakan saat submit
        };

        console.log('Setting form data:', formDataObj);
        setFormData(formDataObj);

        // Set preview image
        let imageUrl = post.image || post.featured_image || post.image_url || '';

        if (imageUrl) {
          console.log('Setting preview image with URL:', imageUrl);
          const previewUrl = getImageUrl(imageUrl, 'regular');
          console.log('Preview URL:', previewUrl);
          setPreviewImage(previewUrl);
        } else if (slide.image_url) {
          console.log('Using slide image URL:', slide.image_url);
          setPreviewImage(getImageUrl(slide.image_url, slide.image_source || 'regular'));
        }

        toast.success('Data slide berhasil dimuat');
      } catch (error) {
        console.error('Error fetching regular post data:', error);

        // Jangan tampilkan toast error, hanya log error
        console.error('Error details:', error.message);

        // Fallback ke data slide yang ada
        setFormData({
          title: slide.title || '',
          description: slide.description || '',
          image_url: slide.image_url || '',
          link: slide.link || '',
          button_text: slide.button_text || '',
          active: slide.active === 1,
          post_id: slide.post_id || '',
          isFromRegularPost: true,
          slideId: slide.id
        });

        // Pastikan preview image tetap ditampilkan
        if (slide.image_url) {
          console.log('Using fallback image URL:', slide.image_url, 'with source:', slide.image_source);
          setPreviewImage(getImageUrl(slide.image_url, slide.image_source));
        }

        // Tetap tampilkan toast success
        toast.success('Data slide berhasil dimuat');
      } finally {
        setLoading(false);
      }
    };

    fetchRegularPostData();
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Jika ini adalah slide dari regular post, kita hanya perlu memperbarui beberapa field
      if (formData.isFromRegularPost) {
        console.log('Updating slide from regular post with limited fields');

        // Hanya kirim data yang perlu diperbarui
        const slideData = {
          description: formData.description,
          button_text: formData.button_text,
          active: formData.active ? 1 : 0
          // Link tidak diubah untuk slide dari regular post
        };

        const response = await api.put(`/api/carousel/${editingSlide.id}`, slideData);

        if (response.data && response.data.success) {
          toast.success('Slide dari regular post berhasil diperbarui');
          setIsModalOpen(false);
          fetchSlides();
        } else {
          toast.error('Gagal memperbarui slide');
        }
      } else {
        // Proses normal untuk slide biasa
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('link', formData.link);
        formDataToSend.append('button_text', formData.button_text);
        formDataToSend.append('active', formData.active ? 1 : 0);
        formDataToSend.append('post_id', formData.post_id || '');

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
      }
    } catch (err) {
      console.error('Error saving slide:', err);
      toast.error('Terjadi kesalahan saat menyimpan slide');
    } finally {
      setLoading(false);
    }
  };

  // Handle replace slide with carousel post
  const handleReplaceWithCarouselPost = async (postId) => {
    try {
      setLoading(true);

      // Jika menambahkan slide baru (bukan mengganti), periksa jumlah slide aktif
      if (!selectedSlideId) {
        const activeSlides = slides.filter(slide => slide.active === 1);
        if (activeSlides.length >= 5) {
          toast.error('Maksimal hanya 5 slide yang dapat aktif. Nonaktifkan slide lain terlebih dahulu.');
          setLoading(false);
          return;
        }
      }

      const url = selectedSlideId
        ? `/api/carousel/replace/${selectedSlideId}`
        : '/api/carousel';

      const response = await api.post(url, { postId, postType: 'carousel' });

      if (response.data && response.data.success) {
        toast.success(response.data.message || 'Slide berhasil diperbarui');
        setIsReplaceModalOpen(false);
        fetchSlides();
        fetchCarouselPosts();
      } else {
        toast.error(response.data?.message || 'Gagal memperbarui slide');
      }
    } catch (err) {
      console.error('Error replacing slide with carousel post:', err);
      // Tampilkan pesan error dari backend jika ada
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Terjadi kesalahan saat memperbarui slide');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle replace slide with regular post
  const handleReplaceWithRegularPost = async (postId) => {
    try {
      setLoading(true);

      // Jika menambahkan slide baru (bukan mengganti), periksa jumlah slide aktif
      if (!selectedSlideId) {
        const activeSlides = slides.filter(slide => slide.active === 1);
        if (activeSlides.length >= 5) {
          toast.error('Maksimal hanya 5 slide yang dapat aktif. Nonaktifkan slide lain terlebih dahulu.');
          setLoading(false);
          return;
        }
      }

      const url = selectedSlideId
        ? `/api/carousel/replace/${selectedSlideId}`
        : '/api/carousel';

      const response = await api.post(url, { postId, postType: 'regular' });

      if (response.data && response.data.success) {
        toast.success(response.data.message || 'Slide berhasil diperbarui');
        setIsReplaceModalOpen(false);
        fetchSlides();
      } else {
        toast.error(response.data?.message || 'Gagal memperbarui slide');
      }
    } catch (err) {
      console.error('Error replacing slide with regular post:', err);
      // Tampilkan pesan error dari backend jika ada
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Terjadi kesalahan saat memperbarui slide');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update carousel post status
  const updatePostStatus = async (postId, newStatus) => {
    try {
      setLoading(true);

      const response = await api.put(`/api/carousel-post/status/${postId}`, { status: newStatus });

      if (response.data && response.data.success) {
        toast.success(response.data.message || `Status berhasil diubah menjadi ${newStatus}`);
        fetchCarouselPosts();
      } else {
        toast.error(response.data?.message || 'Gagal mengubah status');
      }
    } catch (err) {
      console.error('Error updating carousel post status:', err);
      toast.error('Terjadi kesalahan saat mengubah status');
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

      // If trying to activate and already 5 active slides
      if (slide.active === 0) {
        const activeSlides = slides.filter(s => s.active === 1);
        if (activeSlides.length >= 5) {
          toast.error('Maksimal hanya 5 slide yang dapat aktif. Nonaktifkan slide lain terlebih dahulu.');
          setLoading(false);
          return;
        }
      }

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

  // Delete carousel post
  const handleDeleteCarouselPost = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus carousel post ini?')) {
      try {
        setLoading(true);
        const response = await api.delete(`/api/carousel-post/${id}`);

        if (response.data && response.data.success) {
          toast.success('Carousel post berhasil dihapus');
          fetchCarouselPosts();
        } else {
          toast.error('Gagal menghapus carousel post');
        }
      } catch (err) {
        console.error('Error deleting carousel post:', err);
        toast.error('Terjadi kesalahan saat menghapus carousel post');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && slides.length === 0) {
    return (
      <div className="writer-carousel-manager">
        <div className="writer-carousel-manager-header">
          <h2>Kelola Carousel</h2>
        </div>
        <div className="writer-carousel-manager-content">
          <div className="writer-carousel-manager-skeleton">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="writer-carousel-item-skeleton">
                <Skeleton height={150} width="100%" className="mb-2" />
                <Skeleton height={24} width="80%" className="mb-2" />
                <Skeleton height={16} width="60%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="writer-carousel-manager-error">{error}</div>;
  }

  return (
    <div className="writer-carousel-manager">
      <div className="writer-carousel-manager-header">
        <h2>Kelola Carousel</h2>
        <div className="writer-carousel-header-buttons">
          <button
            className="writer-carousel-add-button writer-carousel-post-button"
            onClick={() => navigate('/admin/add-carousel-post')}
            disabled={loading}
          >
            <PlusIcon className="w-5 h-5 mr-1" />
            Buat Carousel Post
          </button>
          <button
            className="writer-carousel-add-button"
            onClick={handleAddSlide}
            disabled={loading}
          >
            <PlusIcon className="w-5 h-5 mr-1" />
            Tambah Slide
          </button>
        </div>
      </div>

      {draftPostsInSlides.length > 0 && (
        <div className="writer-carousel-warning-banner">
          <div className="writer-carousel-warning-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="writer-carousel-warning-content">
            <h4>Perhatian: Ada {draftPostsInSlides.length} post carousel berstatus draft yang digunakan dalam slides!</h4>
            <p>Post carousel dengan status draft tidak akan ditampilkan di carousel publik. Silakan publish post-post berikut:</p>
            <ul className="writer-carousel-warning-list">
              {draftPostsInSlides.map(post => (
                <li key={post.id}>
                  <span className="writer-carousel-warning-post-title">{post.title}</span>
                  <button
                    className="writer-carousel-warning-publish-button"
                    onClick={() => updatePostStatus(post.id, 'published')}
                  >
                    Publish Sekarang
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="writer-carousel-tabs">
        <button
          className={`writer-carousel-tab ${activeTab === 'slides' ? 'active' : ''}`}
          onClick={() => setActiveTab('slides')}
        >
          Slides
        </button>
        <button
          className={`writer-carousel-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Carousel Posts
        </button>
      </div>

      {activeTab === 'slides' ? (
        slides.length === 0 ? (
          <div className="writer-carousel-manager-empty">
            Belum ada slide carousel. Klik "Tambah Slide" untuk membuat slide baru.
          </div>
        ) : (
          <div className="writer-carousel-slides-list">
            <div className="writer-carousel-active-count">
              <p>Slide aktif: {slides.filter(slide => slide.active === 1).length}/5</p>
              <p className="writer-carousel-note">Catatan: Maksimal 5 slide yang dapat aktif pada saat bersamaan</p>
            </div>
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
                {/* Log untuk debugging */}
                {console.log('Admin carousel slide image:', {
                  slide_id: slide.id,
                  image_url: slide.image_url,
                  image_source: slide.image_source,
                  processed_url: getImageUrl(slide.image_url, slide.image_source),
                  post_id: slide.post_id,
                  post_title: slide.post_title
                })}
                <LazyImage
                  src={getImageUrl(slide.image_url, slide.image_source)}
                  alt={slide.title}
                  height="80px"
                  width="150px"
                  objectFit="cover"
                  onError={(e) => {
                    if (!e || !e.target) {
                      console.error('Error event or target is undefined');
                      return;
                    }

                    console.error('Admin image failed to load:', slide.image_url);
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
                {slide.post_id && (
                  <div className="writer-carousel-slide-post">
                    Post: {slide.post_title || slide.post_id}
                    {carouselPosts.some(post => post.id === slide.post_id && post.status === 'draft') && (
                      <span className="writer-carousel-slide-post-draft">
                        Draft
                      </span>
                    )}
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
                  className="writer-carousel-action-button replace-button"
                  onClick={() => handleReplaceSlide(slide.id)}
                  title="Ganti dengan Post"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>

                <button
                  className="writer-carousel-action-button carousel-edit-button"
                  onClick={() => {
                    if (slide.post_id) {
                      // Jika slide berasal dari regular post (image_source === 'regular')
                      if (slide.image_source === 'regular') {
                        // Buka modal edit untuk slide dari regular post
                        handleEditRegularPostSlide(slide);
                      } else {
                        // Jika dari carousel post, navigasi ke edit carousel post
                        navigate(`/admin/edit-carousel-post/${slide.id}`);
                      }
                    } else {
                      // Slide biasa tanpa post_id
                      handleEditSlide(slide);
                    }
                  }}
                  title="Edit"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>

                <button
                  className="writer-carousel-action-button carousel-delete-button"
                  onClick={() => handleDeleteSlide(slide.id)}
                  title="Hapus"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          </div>
        )
      ) : (
        // Carousel Posts Tab
        carouselPosts.length === 0 ? (
          <div className="writer-carousel-manager-empty">
            Belum ada carousel post. Klik "Buat Carousel Post" untuk membuat post baru.
          </div>
        ) : (
          <div className="writer-carousel-posts-list">
            {carouselPosts.map((post) => (
              <div key={post.id} className="writer-carousel-post-item">
                <div className="writer-carousel-post-image">
                  <LazyImage
                    src={getImageUrl(post.image_url, 'carousel')}
                    alt={post.title}
                    height="80px"
                    width="150px"
                    objectFit="cover"
                  />
                </div>

                <div className="writer-carousel-post-content">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt || (post.content && post.content.substring(0, 100) + '...')}</p>
                  <div className="writer-carousel-post-meta">
                    <span>Dibuat: {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="writer-carousel-post-actions">
                  <div className="writer-carousel-post-status">
                    <span className={`status-badge ${post.status === 'published' ? 'published' : 'draft'}`}>
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <button
                    className="writer-carousel-action-button carousel-edit-button"
                    onClick={() => {
                      console.log(`Navigating to edit carousel post with ID: ${post.id}`);
                      navigate(`/admin/edit-carousel-post/${post.id}`);
                    }}
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>

                  <button
                    className="writer-carousel-action-button view-button"
                    onClick={() => navigate(`/carousel-post/${post.slug}`)}
                    title="Lihat"
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                  </button>

                  {post.status === 'draft' && (
                    <button
                      className="writer-carousel-action-button publish-button"
                      onClick={() => updatePostStatus(post.id, 'published')}
                      title="Publish"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  )}

                  {post.status === 'published' && (
                    <button
                      className="writer-carousel-action-button unpublish-button"
                      onClick={() => updatePostStatus(post.id, 'draft')}
                      title="Unpublish"
                    >
                      <EyeSlashIcon className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    className="writer-carousel-action-button carousel-delete-button"
                    onClick={() => handleDeleteCarouselPost(post.id)}
                    title="Hapus"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
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
              {formData.isFromRegularPost && (
                <div className="writer-carousel-modal-info">
                  <InformationCircleIcon className="writer-carousel-info-icon" />
                  <div>
                    Slide ini berasal dari regular post. Anda hanya dapat mengubah deskripsi, teks tombol, dan status aktif.
                  </div>
                </div>
              )}

              <div className="writer-carousel-form-group">
                <label htmlFor="title">Judul</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={formData.isFromRegularPost}
                  className={formData.isFromRegularPost ? 'disabled' : ''}
                />
                {formData.isFromRegularPost && (
                  <small className="form-text text-muted">
                    Judul diambil dari post asli dan tidak dapat diubah.
                  </small>
                )}
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
                {formData.isFromRegularPost ? (
                  <>
                    <div className="writer-carousel-readonly-field">
                      {formData.link}
                    </div>
                    <small className="form-text text-muted">
                      Link diambil dari post asli dan tidak dapat diubah.
                    </small>
                  </>
                ) : (
                  <input
                    type="text"
                    id="link"
                    name="link"
                    value={formData.link}
                    onChange={handleInputChange}
                    placeholder="Contoh: /about atau https://example.com"
                  />
                )}
              </div>

              {!formData.isFromRegularPost && (
                <div className="writer-carousel-form-group">
                  <label htmlFor="post_id">Pilih Post (opsional)</label>
                  <select
                    id="post_id"
                    name="post_id"
                    value={formData.post_id}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Pilih Post --</option>
                    {posts.map(post => (
                      <option key={post.id} value={post.id}>
                        {post.title}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    Jika dipilih, link di atas akan diabaikan dan tombol akan mengarah ke post ini
                  </small>
                </div>
              )}

              {formData.isFromRegularPost && formData.post_id && (
                <div className="writer-carousel-form-group">
                  <label>Post Terkait</label>
                  <div className="writer-carousel-readonly-field">
                    {formData.regularPostData ? formData.regularPostData.title : formData.title}
                  </div>
                  <small className="form-text text-muted">
                    Slide ini terhubung dengan post di atas dan tidak dapat diubah.
                  </small>
                </div>
              )}

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

              {!formData.isFromRegularPost ? (
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
              ) : (
                <div className="writer-carousel-form-group">
                  <label>Gambar</label>
                  <div className="writer-carousel-readonly-message">
                    Gambar diambil dari post asli dan tidak dapat diubah.
                  </div>
                </div>
              )}

              {previewImage && (
                <div className="writer-carousel-image-preview">
                  <LazyImage
                    src={previewImage}
                    alt="Preview"
                    height="200px"
                    width="100%"
                    objectFit="cover"
                  />
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

      {/* Replace Slide Modal */}
      {isReplaceModalOpen && (
        <div className="writer-carousel-modal-overlay">
          <div className="writer-carousel-modal">
            <div className="writer-carousel-modal-header">
              <h3>{selectedSlideId ? 'Ganti Slide dengan Post' : 'Tambah Slide dari Post'}</h3>
              <button
                className="writer-carousel-modal-close"
                onClick={() => setIsReplaceModalOpen(false)}
                disabled={loading}
              >
                &times;
              </button>
            </div>

            <div className="writer-carousel-modal-body">
              <div className="writer-carousel-modal-tabs">
                <button
                  className={`writer-carousel-modal-tab ${activeModalTab === 'carousel' ? 'active' : ''}`}
                  onClick={() => setActiveModalTab('carousel')}
                >
                  Carousel Post
                </button>
                <button
                  className={`writer-carousel-modal-tab ${activeModalTab === 'regular' ? 'active' : ''}`}
                  onClick={() => setActiveModalTab('regular')}
                >
                  Regular Post
                </button>
              </div>

              {loading ? (
                <div className="writer-carousel-loading">Memuat...</div>
              ) : activeModalTab === 'carousel' ? (
                <div className="writer-carousel-post-selection">
                  <div className="writer-carousel-modal-info">
                    <InformationCircleIcon className="writer-carousel-info-icon" />
                    <div>
                      {selectedSlideId
                        ? 'Pilih post carousel untuk mengganti slide ini. Hanya post carousel dengan status "published" yang dapat dipilih.'
                        : 'Pilih post carousel untuk dijadikan slide baru. Hanya post carousel dengan status "published" yang dapat dipilih.'}
                    </div>
                  </div>

                  {carouselPosts.filter(post => post.status === 'published').length === 0 ? (
                    <div className="writer-carousel-no-posts">
                      Tidak ada post carousel dalam status published.
                      <button
                        className="writer-carousel-create-post-link"
                        onClick={() => navigate('/admin/add-carousel-post')}
                      >
                        Buat post carousel baru
                      </button>
                    </div>
                  ) : (
                    carouselPosts
                      .filter(post => post.status === 'published')
                      .map(post => {
                        // Cek apakah post ini sudah digunakan dalam slide
                        const isAlreadyUsed = slides.some(slide => slide.post_id === post.id);
                        return (
                        <div
                          key={post.id}
                          className={`writer-carousel-post-selection-item ${isAlreadyUsed ? 'writer-carousel-post-already-used' : ''}`}
                          onClick={() => {
                            if (isAlreadyUsed && !selectedSlideId) {
                              toast.warning('Post ini sudah digunakan dalam slide lain!');
                            } else {
                              handleReplaceWithCarouselPost(post.id);
                            }
                          }}
                        >
                          {isAlreadyUsed && (
                            <div className="writer-carousel-post-used-badge">
                              Sudah digunakan
                            </div>
                          )}
                          <div className="writer-carousel-post-selection-image">
                            <LazyImage
                              src={getImageUrl(post.image_url, 'carousel')}
                              alt={post.title}
                              height="80px"
                              width="150px"
                              objectFit="cover"
                            />
                          </div>
                          <div className="writer-carousel-post-selection-content">
                            <h4>{post.title}</h4>
                            <p>{post.excerpt || (post.content && post.content.substring(0, 100) + '...')}</p>
                          </div>
                        </div>
                      );})
                  )}
                </div>
              ) : (
                <div className="writer-carousel-post-selection">
                  <div className="writer-carousel-modal-info">
                    <InformationCircleIcon className="writer-carousel-info-icon" />
                    <div>
                      {selectedSlideId
                        ? 'Pilih post reguler untuk mengganti slide ini. Post reguler adalah post biasa yang sudah dipublikasikan di website.'
                        : 'Pilih post reguler untuk dijadikan slide baru. Post reguler adalah post biasa yang sudah dipublikasikan di website.'}
                    </div>
                  </div>

                  <div className="writer-carousel-search-container">
                    <input
                      type="text"
                      className="writer-carousel-search-input"
                      placeholder="Cari post..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {posts.length === 0 ? (
                    <div className="writer-carousel-no-posts">
                      Tidak ada post reguler yang tersedia.
                    </div>
                  ) : (
                    posts
                      .filter(post =>
                        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (post.content && post.content.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map(post => {
                        // Cek apakah post ini sudah digunakan dalam slide
                        const isAlreadyUsed = slides.some(slide => slide.post_id === post.id);
                        return (
                      <div
                        key={post.id}
                        className={`writer-carousel-post-selection-item ${isAlreadyUsed ? 'writer-carousel-post-already-used' : ''}`}
                        onClick={() => {
                          if (isAlreadyUsed && !selectedSlideId) {
                            toast.warning('Post ini sudah digunakan dalam slide lain!');
                          } else {
                            handleReplaceWithRegularPost(post.id);
                          }
                        }}
                      >
                        {isAlreadyUsed && (
                          <div className="writer-carousel-post-used-badge">
                            Sudah digunakan
                          </div>
                        )}
                        <div className="writer-carousel-post-selection-image">
                          <LazyImage
                            src={getImageUrl(post.image_url || post.featured_image || post.image)}
                            alt={post.title}
                            height="80px"
                            width="150px"
                            objectFit="cover"
                          />
                        </div>
                        <div className="writer-carousel-post-selection-content">
                          <h4>{post.title}</h4>
                          <p>{post.excerpt || (post.content && post.content.substring(0, 100) + '...')}</p>
                        </div>
                      </div>
                    );})
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarouselManager;
