import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import ImagePreview from './ImagePreview';
import UploadProgress from './UploadProgress';
import { getImageUrl } from '../../../utils/imageHelper';
import { FaCloudUploadAlt } from 'react-icons/fa';

const PostImage = ({ post, uploadStatus, onImageChange, onRemoveImage }) => {
  // State untuk drag and drop
  const [isDragging, setIsDragging] = useState(false);
  // State untuk menyimpan URL preview gambar
  const [previewUrl, setPreviewUrl] = useState(null);

  // Fungsi untuk mendapatkan URL gambar dari post.image
  const getImageUrlFromPost = useCallback((imageData) => {
    console.log('Getting image URL from:', imageData);

    // Jika imageData adalah File object (baru diupload)
    if (imageData instanceof File) {
      const url = URL.createObjectURL(imageData);
      console.log('Created object URL for File:', url);
      return url;
    }

    // Jika imageData adalah object dengan file property
    if (imageData?.file instanceof File) {
      const url = URL.createObjectURL(imageData.file);
      console.log('Created object URL for file property:', url);
      return url;
    }

    // Jika imageData adalah object dengan url property (dari respons API)
    if (imageData?.url) {
      console.log('Using url property:', imageData.url);
      return imageData.url;
    }

    // Jika imageData adalah object dengan path property
    if (imageData?.path) {
      // Jika path sudah berupa URL lengkap, gunakan langsung
      if (typeof imageData.path === 'string' && imageData.path.startsWith('http')) {
        console.log('Using http path directly:', imageData.path);
        return imageData.path;
      }

      const url = getImageUrl(imageData.path, 'regular');
      console.log('Generated URL from path property:', url);
      return url;
    }

    // Jika imageData adalah string (path langsung)
    if (typeof imageData === 'string') {
      // Jika string sudah berupa URL lengkap, gunakan langsung
      if (imageData.startsWith('http')) {
        console.log('Using http string directly:', imageData);
        return imageData;
      }

      const url = getImageUrl(imageData, 'regular');
      console.log('Generated URL from string:', url);
      return url;
    }

    console.log('No valid image found, returning null');
    return null;
  }, []);

  // Gunakan useEffect untuk mengatur previewUrl saat post.image berubah
  useEffect(() => {
    if (post.image) {
      const url = getImageUrlFromPost(post.image);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Cleanup function untuk melepaskan object URL
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [post.image, getImageUrlFromPost]);

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
              onError={(error) => {
                console.error('Image load error:', error);
                toast.error('Gagal memuat gambar. Coba upload ulang.');

                // Jika terjadi error, coba gunakan URL alternatif jika ada
                if (post.image && typeof post.image === 'object') {
                  if (post.image.url) {
                    console.log('Trying alternative URL from post.image.url');
                    setPreviewUrl(post.image.url);
                  } else if (post.image.path) {
                    console.log('Trying alternative URL from post.image.path');
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