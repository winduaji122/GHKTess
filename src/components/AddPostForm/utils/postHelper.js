export const preparePostData = (post, hasChanges) => {
  const formData = new FormData();
  
  console.log('Preparing post data:', { 
    post, 
    hasChanges,
    spotlight: {
      current: Boolean(post.is_spotlight),
      hasChanged: hasChanges.is_spotlight,
      valueToSend: post.is_spotlight ? '1' : '0'
    }
  });

  // Field wajib selalu dikirim untuk update
  formData.append('title', post.title?.trim() || '');
  formData.append('content', post.content?.trim() || '');
  formData.append('status', post.status || 'draft');
  
  // Handle image
  if (hasChanges.image) {
    if (post.image instanceof File) {
      formData.append('image', post.image);
    } else if (post.image?.file instanceof File) {
      formData.append('image', post.image.file);
    } else if (post.image?.path) {
      formData.append('imagePath', post.image.path);
    }
    // Tambahkan timestamp untuk update gambar
    formData.append('image_updated_at', new Date().toISOString());
  }

  // Handle previous image untuk keperluan penghapusan
  if (post.previous_image) {
    formData.append('previous_image', post.previous_image);
  }

  // Handle labels - pastikan format sesuai dengan tabel post_labels
  if (hasChanges.labels && Array.isArray(post.labels)) {
    const formattedLabels = post.labels.map(label => ({
      id: label.id,
      label: label.label
    }));
    formData.append('labels', JSON.stringify(formattedLabels));
  }

  // Handle tanggal publikasi
  if (hasChanges.publish_date) {
    formData.append('publish_date', post.publish_date || null);
  }

  // Handle slug
  if (hasChanges.slug) {
    formData.append('slug', post.slug?.trim() || '');
  }

  // Handle excerpt (ringkasan)
  if (post.content) {
    const excerpt = post.content
      .replace(/<[^>]*>/g, '') // Hapus HTML tags
      .slice(0, 500); // Ambil 500 karakter pertama
    formData.append('excerpt', excerpt);
  }

  // Handle featured & spotlight flags
  formData.append('is_featured', post.is_featured ? '1' : '0');

  // Pastikan nilai spotlight dipertahankan dari server
  const spotlightValue = typeof post.is_spotlight === 'boolean' 
    ? (post.is_spotlight ? '1' : '0')
    : (post.is_spotlight === 1 || post.is_spotlight === '1' ? '1' : '0');

  formData.append('is_spotlight', spotlightValue);

  // Tambahkan flag untuk menandai apakah ini update dari toggle atau update umum
  formData.append('is_spotlight_toggle', hasChanges.is_spotlight ? 'true' : 'false');

  // Tambahkan flag khusus untuk menandai perubahan spotlight
  if (hasChanges.is_spotlight) {
    formData.append('spotlight_changed', 'true');
  }

  // Handle version
  const nextVersion = post.version ? parseInt(post.version) + 1 : 1;
  formData.append('version', nextVersion.toString());

  // Debug log final FormData
  console.log('FormData entries:', Array.from(formData.entries()));

  // Debug log untuk spotlight
  console.log('Preparing spotlight data:', {
    current: post.is_spotlight,
    hasChanged: hasChanges.is_spotlight,
    valueToSend: post.is_spotlight ? '1' : '0'
  });

  return formData;
};
  
  export const getQuillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false
    }
  };
  
  export const getQuillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];
  
  export const isFormValid = (post, uploadStatus) => {
    console.log('Validating form:', { 
      title: Boolean(post?.title?.trim()),
      content: Boolean(post?.content?.trim()),
      image: Boolean(post?.image || post?.previous_image),
      isUploading: uploadStatus.isUploading
    });
    
    return (
      !uploadStatus.isUploading &&
      post?.title?.trim() &&
      post?.content?.trim() &&
      (post?.image || post?.previous_image) // Pastikan ada gambar
    );
  };
  
  export const getSubmitButtonText = (isEditing, isUploading, isSubmitting) => {
    if (isUploading) return 'Mengunggah...';
    if (isSubmitting) return 'Menyimpan...';
    return isEditing ? 'Perbarui' : 'Publikasikan';
  };