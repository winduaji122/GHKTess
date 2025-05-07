import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import ImagePreview from './ImagePreview';
import UploadProgress from './UploadProgress';
import { getImageUrl, getResponsiveImageUrls } from '../../../utils/imageHelper';
import { FaCloudUploadAlt } from 'react-icons/fa';

const PostImage = ({ post, uploadStatus, onImageChange, onRemoveImage }) => {
  // State untuk drag and drop
  const [isDragging, setIsDragging] = useState(false);
  // State untuk menyimpan URL preview gambar
  const [previewUrl, setPreviewUrl] = useState(null);

  // Fungsi untuk mendapatkan informasi gambar dari post.image
  const getImageInfoFromPost = useCallback((imageData) => {
    // Objek default untuk informasi gambar
    const defaultInfo = {
      url: null,
      thumbnailUrl: null,
      mediumUrl: null,
      srcSet: null,
      sizes: null
    };

    // Jika tidak ada data gambar
    if (!imageData) {
      return defaultInfo;
    }

    // Jika imageData adalah File object (baru diupload)
    if (imageData instanceof File) {
      const url = URL.createObjectURL(imageData);
      return {
        ...defaultInfo,
        url
      };
    }

    // Jika imageData adalah object dengan file property
    if (imageData?.file instanceof File) {
      const url = URL.createObjectURL(imageData.file);
      return {
        ...defaultInfo,
        url
      };
    }

    // Jika imageData adalah object dengan properti dari API baru
    if (typeof imageData === 'object') {
      // Cek apakah ini adalah respons dari API baru dengan kompresi
      if (imageData.thumbnailUrl || imageData.mediumUrl || imageData.srcSet) {
        return {
          url: imageData.url || imageData.path,
          thumbnailUrl: imageData.thumbnailUrl,
          mediumUrl: imageData.mediumUrl,
          srcSet: imageData.srcSet,
          sizes: imageData.sizes || "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika hanya ada url atau path
      if (imageData.url) {
        return {
          ...defaultInfo,
          url: imageData.url
        };
      }

      if (imageData.path) {
        // Jika path sudah berupa URL lengkap, gunakan langsung
        if (typeof imageData.path === 'string' && imageData.path.startsWith('http')) {
          return {
            ...defaultInfo,
            url: imageData.path
          };
        }

        const url = getImageUrl(imageData.path, 'regular');
        return {
          ...defaultInfo,
          url
        };
      }
    }

    // Jika imageData adalah string (path langsung)
    if (typeof imageData === 'string') {
      // Cek apakah imageData adalah UUID (format baru)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(imageData)) {
        // Gunakan getResponsiveImageUrls untuk mendapatkan URL gambar dengan berbagai ukuran
        const imageUrls = getResponsiveImageUrls(imageData);
        return {
          url: imageUrls.original,
          thumbnailUrl: imageUrls.thumbnail,
          mediumUrl: imageUrls.medium,
          srcSet: imageUrls.srcSet,
          sizes: imageUrls.sizes
        };
      }

      // Jika string sudah berupa URL lengkap, gunakan langsung
      if (imageData.startsWith('http')) {
        return {
          ...defaultInfo,
          url: imageData
        };
      }

      const url = getImageUrl(imageData, 'regular');
      return {
        ...defaultInfo,
        url
      };
    }

    return defaultInfo;
  }, []);

  // Gunakan useEffect untuk mengatur previewUrl saat post.image berubah
  useEffect(() => {
    if (post.image) {
      const imageInfo = getImageInfoFromPost(post.image);
      // Gunakan medium URL jika tersedia, jika tidak gunakan URL utama
      setPreviewUrl(imageInfo.mediumUrl || imageInfo.url);
    } else {
      setPreviewUrl(null);
    }

    // Cleanup function untuk melepaskan object URL
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [post.image, getImageInfoFromPost]);

  // Dapatkan informasi gambar lengkap
  const imageInfo = post.image ? getImageInfoFromPost(post.image) : { url: null };

  // Gunakan previewUrl untuk menampilkan gambar
  const imageUrl = previewUrl;

  // Handler untuk drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadStatus.isUploading) {
      setIsDragging(true);
    }
  }, [uploadStatus.isUploading]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadStatus.isUploading) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  }, [uploadStatus.isUploading]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploadStatus.isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0]; // Ambil hanya file pertama

      console.log('File dropped:', {
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

      // Buat preview URL untuk file yang di-drop
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);

      // Buat event palsu untuk diproses oleh onImageChange
      const event = {
        target: {
          files: [file]
        }
      };

      // Panggil callback onImageChange
      onImageChange(event);
    }
  }, [onImageChange, uploadStatus.isUploading]);

  return (
    <div className="writer-post-image">
      <label htmlFor="post-image" className="writer-post-image-label">Gambar Post</label>

      <div
        className={`writer-image-dropzone ${isDragging ? 'writer-dropzone-active' : ''} ${uploadStatus.isUploading ? 'writer-dropzone-uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="post-image"
          onChange={onImageChange}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          disabled={uploadStatus.isUploading}
          className="writer-image-input"
        />

        {!imageUrl && (
          <div className="writer-upload-placeholder">
            <FaCloudUploadAlt className="writer-upload-icon" />
            <p className="writer-upload-text">
              {isDragging
                ? 'Lepaskan gambar di sini'
                : 'Tarik & lepaskan gambar di sini atau klik untuk memilih'}
            </p>
            <p className="writer-upload-hint">Mendukung JPG, PNG, GIF, dan WEBP (Maks. 5MB)</p>

            <label
              htmlFor="post-image"
              className="writer-upload-button"
            >
              {uploadStatus.isUploading ? 'Mengupload...' : 'Pilih Gambar'}
            </label>
          </div>
        )}

        <UploadProgress status={uploadStatus} />

        {imageUrl && (
          <div className="writer-image-preview-container">
            <ImagePreview
              src={imageUrl}
              thumbnailSrc={imageInfo.thumbnailUrl}
              mediumSrc={imageInfo.mediumUrl}
              srcSet={imageInfo.srcSet}
              sizes={imageInfo.sizes}
              onError={(error) => {
                console.error('Image load error:', error);
                toast.error('Gagal memuat gambar. Coba upload ulang.');

                // Jika terjadi error, coba gunakan URL alternatif
                if (post.image && typeof post.image === 'object') {
                  // Coba gunakan URL medium jika tersedia
                  if (post.image.mediumUrl) {
                    setPreviewUrl(post.image.mediumUrl);
                  }
                  // Jika tidak, coba URL utama
                  else if (post.image.url) {
                    setPreviewUrl(post.image.url);
                  }
                  // Jika tidak, coba path
                  else if (post.image.path) {
                    const altUrl = getImageUrl(post.image.path, 'regular');
                    setPreviewUrl(altUrl);
                  }
                }
              }}
              isUploading={uploadStatus.isUploading}
              onRemove={() => {
                // Hapus preview URL jika ada
                if (previewUrl && previewUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl(null);
                onRemoveImage();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostImage;