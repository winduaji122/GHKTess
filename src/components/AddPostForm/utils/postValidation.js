export const validateImage = async (file) => {
    const errors = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
    // Validasi ukuran
    if (file.size > maxSize) {
      errors.push('Ukuran file maksimal 5MB');
    }
  
    // Validasi tipe file
    if (!allowedTypes.includes(file.type)) {
      errors.push('Format file harus JPG, PNG, atau GIF');
    }
  
    // Validasi dimensi gambar
    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < 200 || dimensions.height < 200) {
        errors.push('Dimensi gambar minimal 200x200 pixels');
      }
    } catch (error) {
      errors.push('Gagal memvalidasi dimensi gambar');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar'));
      };
      img.src = URL.createObjectURL(file);
    });
  };
  
  export const validatePost = (post, userRole) => {
    const errors = {};
    
    console.log('Validating post for role:', userRole, {
      title: Boolean(post.title?.trim()),
      content: Boolean(post.content?.trim()),
      publish_date: Boolean(post.publish_date),
      image: Boolean(post.image || post.previous_image),
      category: Boolean(post.category_id),
      labels: Array.isArray(post.labels) ? post.labels.length : 0
    });

    // Validasi dasar untuk semua role
    if (!post.title?.trim()) {
      errors.title = 'Judul tidak boleh kosong';
    }

    if (!post.content?.trim()) {
      errors.content = 'Konten tidak boleh kosong';
    }

    if (!post.publish_date) {
      errors.publish_date = 'Tanggal publikasi harus diisi';
    }
    
    // Validasi tambahan hanya untuk writer
    if (userRole === 'writer') {
      if (!post.image && !post.previous_image) {
        errors.image = 'Gambar thumbnail harus diupload';
      }
      
      if (!post.category_id) {
        errors.category = 'Kategori harus dipilih';
      }
      
      if (!Array.isArray(post.labels) || post.labels.length === 0) {
        errors.labels = 'Minimal satu label harus dipilih';
      }
    }

    const isValid = Object.keys(errors).length === 0;
    
    console.log('Validation result:', { isValid, errors });
    
    return {
      isValid,
      errors
    };
  };