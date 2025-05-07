import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { getPostById } from '../../../api/postApi';
import { formatDateTimeForInput } from '../utils/postFormatter';
import { preparePostData } from '../utils/postHelper';
import { updatePost, createPost, toggleSpotlight, resetFeaturedPosts, toggleFeaturedPost } from '../../../api/postApi';
import { api } from '../../../api/axios';
import moment from 'moment';
import { uploadImage } from '../../../api/uploadApi';
import { getImageUrl } from '../../../utils/imageHelper';

export const usePostForm = (isEditing, postId, userRole) => {
  const navigate = useNavigate();
  const [showSlugConfirm, setShowSlugConfirm] = useState(false);
  const titleInputRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Simpan role user yang diberikan dari props
  const [userRoleState] = useState(userRole);

  // State untuk form dengan nilai default yang valid
  const [post, setPost] = useState({
    title: '',
    content: '',
    image: null,
    previous_image: null,
    image_updated_at: null,
    publish_date: formatDateTimeForInput(new Date()),
    status: 'draft',
    is_spotlight: false,
    is_featured: false,
    labels: [],
    slug: '',
    excerpt: '',
    version: 1,
    tags: '',
    allow_comments: true
  });

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState({
    title: false,
    content: false,
    image: false,
    publish_date: false,
    status: false,
    is_spotlight: false,
    is_featured: false,
    labels: false,
    slug: false,
    tags: false,
    allow_comments: false
  });

  // Tambahkan state untuk initialPost
  const [initialPost, setInitialPost] = useState(null);

  // Tambahkan state untuk formErrors
  const [formErrors, setFormErrors] = useState({});

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    speed: 0
  });

  // Load post data
  useEffect(() => {
    const loadPost = async () => {
      if (isEditing && postId) {
        try {
          setIsLoading(true);
          const postData = await getPostById(postId);

          if (!postData || typeof postData !== 'object') {
            throw new Error('Data post tidak valid');
          }

          // Format data dengan nilai default yang aman
          const formattedPost = {
            ...postData,
            title: postData.title?.trim() || '',
            content: postData.content?.trim() || '',
            image: postData.image || null,
            publish_date: formatDateTimeForInput(
              postData.publish_date ? new Date(postData.publish_date) : new Date()
            ),
            status: ['draft', 'published'].includes(postData.status) ?
              postData.status : 'draft',
            is_spotlight: Boolean(postData.is_spotlight),
            is_featured: Boolean(postData.is_featured),
            labels: Array.isArray(postData.labels) ?
              postData.labels.filter(label =>
                label && typeof label === 'object' &&
                label.id && typeof label.label === 'string'
              ) : [],
            slug: postData.slug?.trim() || '',
            version: postData.version,
            tags: postData.tags || '',
            allow_comments: postData.allow_comments !== undefined ? Boolean(postData.allow_comments) : true
          };

          setPost(formattedPost);

          // Set initial hasChanges untuk field yang ada
          const initialChanges = {};
          Object.keys(formattedPost).forEach(key => {
            initialChanges[key] = false;
          });
          setHasChanges(initialChanges);

          // Tunggu sampai data selesai dimuat sebelum menampilkan konfirmasi
          if (!postData.title && postData.slug) {
            setTimeout(() => {
              setShowSlugConfirm(true);
            }, 1000);
          }

          // Set preview gambar jika ada
          if (postData.image) {
            const imageUrl = getImageUrl(postData.image);
            setImagePreview(imageUrl);
            console.log('Image preview set for editing:', imageUrl);
          }

        } catch (error) {
          console.error('Error loading post:', error);
          toast.error('Gagal memuat post: ' + (error.message || 'Unknown error'));
        } finally {
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      } else {
        setIsInitialLoad(false);
      }
    };
    loadPost();
  }, [isEditing, postId]);

  // Handle konfirmasi slug setelah UI siap dan loading selesai
  useEffect(() => {
    if (showSlugConfirm && !isLoading && !isInitialLoad) {
      const timer = setTimeout(() => {
        const useSlug = window.confirm(
          'Judul kosong. Gunakan judul dari slug yang ada?'
        );
        if (useSlug) {
          setPost(prevPost => ({
            ...prevPost,
            title: prevPost.slug
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          }));
          trackChange('title');

          // Scroll dan fokus ke input judul
          setTimeout(() => {
            if (titleInputRef.current) {
              titleInputRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
              titleInputRef.current.focus();
            }
          }, 100);
        }
        setShowSlugConfirm(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showSlugConfirm, isLoading, isInitialLoad]);

  // Track changes untuk setiap field
  const trackChange = (field) => {
    if (!post.hasOwnProperty(field)) {
      console.warn(`Trying to track changes for non-existent field: ${field}`);
      return;
    }
    setHasChanges(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Handle changes untuk setiap field
  const handleTitleChange = (e) => {
    setPost(prev => ({ ...prev, title: e.target.value }));
    trackChange('title');
  };

  const handleContentChange = (content) => {
    setPost(prev => ({ ...prev, content }));
    trackChange('content');
  };

  // Fungsi untuk validasi tanggal
  const validatePublishDate = (dateString, status) => {
    if (!dateString) {
      return {
        isValid: false,
        message: 'Tanggal publikasi wajib diisi'
      };
    }

    const publishDate = moment(dateString);
    const now = moment();

    // Jika tanggal tidak valid
    if (!publishDate.isValid()) {
      return {
        isValid: false,
        message: 'Format tanggal tidak valid'
      };
    }

    // Hanya validasi tanggal di masa lalu jika status adalah 'published'
    if (status === 'published' && publishDate.isBefore(now)) {
      return {
        isValid: false,
        message: `Tanggal publikasi tidak boleh di masa lalu untuk post yang dipublikasikan. Gunakan tanggal ${now.format('DD/MM/YYYY HH:mm')} atau setelahnya.`
      };
    }

    return {
      isValid: true,
      message: ''
    };
  };

  // Handler untuk perubahan tanggal
  const handleDateChange = (e) => {
    const dateValue = e.target.value;

    setPost(prev => ({
      ...prev,
      publish_date: dateValue
    }));

    // Validasi tanggal saat perubahan (opsional)
    const validation = validatePublishDate(dateValue, post.status);
    if (!validation.isValid) {
      setFormErrors(prev => ({
        ...prev,
        publish_date: validation.message
      }));
    } else {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.publish_date;
        return newErrors;
      });
    }

    setHasChanges(prev => ({
      ...prev,
      publish_date: true
    }));
  };

  // Fungsi untuk mengatur tanggal ke hari ini + 1 jam
  const handleSetToday = useCallback(() => {
    const now = moment().add(1, 'hour');
    const formattedDate = now.format('YYYY-MM-DDTHH:mm');

    setPost(prev => ({
      ...prev,
      publish_date: formattedDate
    }));

    // Hapus error tanggal jika ada
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.publish_date;
      return newErrors;
    });

    setHasChanges(prev => ({
      ...prev,
      publish_date: true
    }));
  }, []);

  const handleStatusChange = (status) => {
    setPost(prev => ({ ...prev, status }));
    trackChange('status');
  };

  const handleSpotlightToggle = useCallback(async (checked) => {
    console.log('Handling spotlight toggle:', {
      checked,
      postId,
      currentSpotlight: Boolean(post.is_spotlight),
      initialSpotlight: Boolean(initialPost?.is_spotlight),
      isEditing: isEditing
    });

    // Pastikan nilai boolean
    const newSpotlightValue = Boolean(checked);

    // Update state dengan nilai boolean
    setPost(prev => ({
      ...prev,
      is_spotlight: newSpotlightValue
    }));

    // Tandai bahwa perubahan berasal dari toggle
    setHasChanges(prev => ({
      ...prev,
      is_spotlight: true,  // Ini yang akan digunakan sebagai spotlight_changed
      spotlight_source: 'toggle'  // Tambahan informasi sumber perubahan
    }));

    // Jika dalam mode create post, cukup update state lokal
    if (!isEditing || !postId) {
      console.log('Create mode or no post ID: only updating local state for spotlight');
      return;
    }

    try {
      const response = await toggleSpotlight(postId, newSpotlightValue);

      if (!response.success) {
        throw new Error(response.message || 'Gagal mengubah status spotlight');
      }

      // Update state dengan nilai dari server
      const serverSpotlightValue = Boolean(response.data.is_spotlight);

      setPost(prev => ({
        ...prev,
        is_spotlight: serverSpotlightValue,
        version: response.data.version,
        updated_at: response.data.updated_at
      }));

      // Update initialPost dengan nilai dari server
      setInitialPost(prev => ({
        ...prev,
        is_spotlight: serverSpotlightValue,
        version: response.data.version,
        updated_at: response.data.updated_at
      }));

      toast.success(response.message);

    } catch (error) {
      console.error('Error:', error);

      // Tangani error berdasarkan jenis
      if (error.response) {
        // Error dari server dengan response
        toast.error(error.response.data.message || 'Terjadi kesalahan pada server');
      } else if (error.request) {
        // Error karena tidak ada response
        toast.error('Tidak dapat terhubung ke server');
      } else {
        // Error lainnya
        toast.error('Terjadi kesalahan: ' + error.message);
      }
      // Kembalikan ke nilai sebelumnya jika gagal
      setPost(prev => ({
        ...prev,
        is_spotlight: Boolean(initialPost?.is_spotlight)
      }));
      setHasChanges(prev => ({
        ...prev,
        is_spotlight: false
      }));
    }
  }, [postId, post.is_spotlight, initialPost, isEditing]);

  const handleFeaturedToggle = async (isChecked) => {
    try {
      console.log('Toggling featured status to:', isChecked);

      // Update state lokal terlebih dahulu untuk UI responsif
      setPost(prev => ({
        ...prev,
        is_featured: isChecked
      }));
      setHasChanges(prev => ({
        ...prev,
        is_featured: true
      }));

      // Jika dalam mode tambah post baru, cukup update state lokal
      if (!isEditing || !post.id) {
        console.log('Add mode or no post ID: only updating local state');
        return;
      }

      // Panggil API untuk update status featured
      const response = await toggleFeaturedPost(post.id, isChecked);
      console.log('Update featured response:', response);

      if (response.success) {
        toast.success(
          isChecked
            ? 'Post berhasil dijadikan featured!'
            : 'Post berhasil dihapus dari featured!'
        );

        // Update state dengan data dari response jika ada
        // Periksa apakah response.data.post atau response.post ada sebelum mengakses propertinya
        if (response.data && response.data.post) {
          setPost(prev => ({
            ...prev,
            is_featured: response.data.post.is_featured
          }));
        } else if (response.post) {
          setPost(prev => ({
            ...prev,
            is_featured: response.post.is_featured
          }));
        }
      } else {
        toast.error(response.message || 'Gagal mengubah status featured post');
        // Kembalikan state ke nilai sebelumnya jika gagal
        setPost(prev => ({
          ...prev,
          is_featured: !isChecked
        }));
      }
    } catch (error) {
      console.error('Error in handleFeaturedToggle:', error);
      toast.error('Terjadi kesalahan saat mengubah status featured post');
      // Kembalikan state ke nilai sebelumnya jika terjadi error
      setPost(prev => ({
        ...prev,
        is_featured: !isChecked
      }));
    }
  };

  // Handler untuk perubahan gambar
  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Image file selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.');
      return;
    }

    // Validasi ukuran file (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }

    // Set file untuk upload
    setImageFile(file);

    // Buat preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // PENTING: Jangan simpan file object di state post.image
    // Kita akan mengupload file terlebih dahulu dan menyimpan path-nya nanti
  }, []);

  // Handler untuk menghapus gambar
  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview('');

    setPost(prev => ({
      ...prev,
      image: null
    }));

    setHasChanges(prev => ({
      ...prev,
      image: true
    }));
  }, []);

  // Handler untuk submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');

    try {
      setIsSubmitting(true);

      // Validasi form
      if (!post.title || !post.content) {
        toast.error('Judul dan konten wajib diisi');
        setIsSubmitting(false);
        return;
      }

      // Upload gambar terlebih dahulu jika ada file baru
      let imagePath = post.image; // Gunakan nilai yang sudah ada jika tidak ada file baru
      console.log('Initial image path:', imagePath);

      if (imageFile) {
        try {
          console.log('Uploading image file:', imageFile.name);

          setUploadStatus({
            isUploading: true,
            progress: 0,
            speed: 0
          });

          // Gunakan API upload baru dengan kompresi otomatis
          const uploadOptions = {
            postId: post.id, // Kirim postId jika sedang edit
            userId: post.user_id // Kirim userId jika tersedia
          };

          const uploadResponse = await uploadImage(imageFile, uploadOptions, (progressData) => {
            setUploadStatus({
              isUploading: true,
              progress: progressData.progress,
              speed: progressData.speed
            });
          });

          setUploadStatus({
            isUploading: false,
            progress: 100,
            speed: 0
          });

          if (uploadResponse.success) {
            // Simpan data gambar dari respons API baru
            const imageData = {
              id: uploadResponse.id,
              path: uploadResponse.path,
              url: uploadResponse.url,
              thumbnailUrl: uploadResponse.thumbnailUrl,
              mediumUrl: uploadResponse.mediumUrl,
              srcSet: uploadResponse.srcSet,
              sizes: uploadResponse.sizes,
              width: uploadResponse.width,
              height: uploadResponse.height
            };

            // Update state post dengan data gambar baru
            setPost(prev => ({
              ...prev,
              image: imageData
            }));

            // Gunakan path untuk form submission
            imagePath = uploadResponse.path;

            // Update preview dengan URL medium untuk performa lebih baik
            setImagePreview(uploadResponse.mediumUrl || uploadResponse.url);
          } else {
            toast.error(uploadResponse.message || 'Gagal mengupload gambar');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Gagal mengupload gambar: ' + (error.message || 'Unknown error'));
        }
      }

      // Siapkan formData untuk post
      const formData = new FormData();

      // Tambahkan field dasar
      formData.append('title', post.title);
      formData.append('content', post.content);
      formData.append('excerpt', post.excerpt || '');
      formData.append('status', post.status || 'draft');
      formData.append('publish_date', post.publish_date || '');
      formData.append('is_featured', post.is_featured ? '1' : '0');
      formData.append('is_spotlight', post.is_spotlight ? '1' : '0');
      formData.append('tags', post.tags || '');
      formData.append('allow_comments', post.allow_comments ? '1' : '0');

      // Tambahkan slug jika ada
      if (post.slug) {
        formData.append('slug', post.slug);
      }

      // Tambahkan labels jika ada
      if (post.labels && post.labels.length > 0) {
        const labelIds = post.labels.map(label => {
          if (typeof label === 'object' && label !== null && label.id) {
            return label.id;
          }
          return label;
        });

        formData.append('labels', JSON.stringify(labelIds));
      }

      // PENTING: Tambahkan image path jika ada
      // Pastikan kita tidak mengirim string kosong atau objek
      if (imagePath) {
        // Jika imagePath adalah objek, coba ekstrak path
        if (typeof imagePath === 'object' && imagePath !== null) {
          console.warn('Image path is an object:', imagePath);

          // Coba berbagai properti yang mungkin berisi path
          const possiblePaths = ['path', 'filename', 'url', 'src'];
          for (const prop of possiblePaths) {
            if (imagePath[prop] && typeof imagePath[prop] === 'string') {
              console.log(`Using object property ${prop}:`, imagePath[prop]);
              imagePath = imagePath[prop];
              break;
            }
          }

          // Jika masih objek, jangan kirim
          if (typeof imagePath === 'object') {
            console.error('Could not extract path from object, not sending image');
            // Jangan tambahkan ke formData
          } else {
            console.log('Adding extracted image path to form data:', imagePath);
            formData.append('image', imagePath);
          }
        } else if (typeof imagePath === 'string' && imagePath.trim() !== '') {
          // Jika string dan tidak kosong
          console.log('Adding image path to form data:', imagePath);
          formData.append('image', imagePath);
        } else {
          console.log('Image path is invalid, not sending:', imagePath);
          // Jangan tambahkan ke formData
        }
      } else {
        console.log('No image path to send');
      }

      // Debug log untuk FormData
      const formDataEntries = {};
      for (const [key, value] of formData.entries()) {
        formDataEntries[key] = value instanceof File ?
          `File: ${value.name} (${value.size} bytes)` : value;
      }
      console.log('FormData entries:', formDataEntries);

      // Kirim request ke API
      console.log(`Sending ${isEditing ? 'PUT' : 'POST'} request to API`);
      const response = isEditing
        ? await updatePost(post.id, formData)
        : await createPost(formData);

      console.log('API response:', response);

      if (response.success) {
        toast.success(isEditing ? 'Post berhasil diperbarui' : 'Post berhasil dibuat');

        // Redirect dengan state refresh
        // Gunakan role dari props jika tersedia, jika tidak coba ambil dari localStorage
        let role = userRoleState;

        // Jika tidak ada role dari props, coba ambil dari localStorage
        if (!role) {
          try {
            // Coba beberapa kemungkinan key untuk user di localStorage
            const possibleKeys = ['user', 'auth_user', 'userData', 'currentUser'];
            for (const key of possibleKeys) {
              const userData = localStorage.getItem(key);
              if (userData) {
                const user = JSON.parse(userData);
                if (user && user.role) {
                  role = user.role;
                  console.log(`Found user role in localStorage with key: ${key}`, role);
                  break;
                }
              }
            }
          } catch (error) {
            console.error('Error parsing user data from localStorage:', error);
          }
        }

        console.log('User role for redirect:', role);

        if (role === 'admin') {
          console.log('Redirecting to admin/posts');
          navigate('/admin/posts', { state: { refresh: true, timestamp: Date.now() } });
        } else if (role === 'writer') {
          console.log('Redirecting to writer/posts');
          navigate('/writer/posts', { state: { refresh: true, timestamp: Date.now() } });
        } else {
          console.log('Redirecting to home (no role found)');
          navigate('/');
        }
      } else {
        toast.error(response.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error submitting post:', error);

      // Tangani error berdasarkan jenis
      if (error.response) {
        console.error('Server response error:', error.response.data);
        toast.error(error.response.data?.message || 'Terjadi kesalahan pada server');
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('Tidak dapat terhubung ke server');
      } else {
        console.error('Request error:', error.message);
        toast.error('Terjadi kesalahan: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler untuk perubahan label
  const handleLabelChange = useCallback((selectedLabels) => {
    console.log('Selected labels:', selectedLabels);

    // Pastikan selectedLabels adalah array
    if (!Array.isArray(selectedLabels)) {
      selectedLabels = [];
    }

    // Format labels dengan benar
    const formattedLabels = selectedLabels.map(label => {
      // Jika label sudah berupa objek dengan id dan name, gunakan itu
      if (typeof label === 'object' && label !== null && label.id) {
        return {
          id: label.id,
          name: label.name || label.label || ''
        };
      }

      // Jika label hanya berupa ID
      if (typeof label === 'string' || typeof label === 'number') {
        return {
          id: label,
          name: ''
        };
      }

      return null;
    }).filter(Boolean); // Hapus nilai null

    setPost(prev => ({
      ...prev,
      labels: formattedLabels
    }));
  }, []);

  // Handler untuk perubahan tags
  const handleTagsChange = useCallback((value) => {
    // TagsInput mengirimkan nilai string langsung, bukan event
    setPost(prev => ({
      ...prev,
      tags: value
    }));
    trackChange('tags');
  }, []);

  // Handler untuk toggle allow_comments
  const handleCommentsToggle = useCallback((checked) => {
    setPost(prev => ({
      ...prev,
      allow_comments: checked
    }));
    trackChange('allow_comments');
  }, []);

  // Fungsi handleDeletePost dipindahkan ke komponen PostList

  return {
    post,
    setPost,
    isLoading,
    isSubmitting,
    hasChanges,
    setHasChanges,
    handleTitleChange,
    handleContentChange,
    handleDateChange,
    handleSetToday,
    handleStatusChange,
    handleFeaturedToggle,
    handleSpotlightToggle,
    handleImageChange,
    handleRemoveImage,
    handleLabelChange,
    handleTagsChange,
    handleCommentsToggle,
    handleSubmit,
    titleInputRef,
    showSlugConfirm,
    setShowSlugConfirm,
    initialPost,
    formErrors,
    imageFile,
    imagePreview,
    uploadStatus,
    trackChange
  };
};
