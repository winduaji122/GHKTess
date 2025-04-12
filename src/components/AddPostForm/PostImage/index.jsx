import React, { useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import ImagePreview from './ImagePreview';
import UploadProgress from './UploadProgress';
import { getImageUrl } from '../../../utils/imageHelper';
import { FaCloudUploadAlt, FaImage } from 'react-icons/fa';

const PostImage = ({ post, uploadStatus, onImageChange, onRemoveImage }) => {
  // State untuk drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Debug log untuk melihat data post
  console.log('Post data in PostImage:', post);

  const imageUrl = useMemo(() => {
    // Jika post.image adalah File object (baru diupload)
    if (post.image instanceof File) {
      return URL.createObjectURL(post.image);
    }

    // Jika post.image adalah object dengan file property
    if (post.image?.file instanceof File) {
      return URL.createObjectURL(post.image.file);
    }

    // Jika post.image adalah object dengan path
    if (post.image?.path) {
      return getImageUrl(post.image.path);
    }

    // Jika post.image adalah string (path langsung)
    if (typeof post.image === 'string') {
      return getImageUrl(post.image);
    }

    return null;
  }, [post.image]);

  // Debug log untuk URL yang dihasilkan
  console.log('Generated image URL:', imageUrl);

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
      // Buat event palsu untuk diproses oleh onImageChange
      const fileList = files;
      const event = {
        target: {
          files: fileList
        }
      };
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
                toast.error('Gagal memuat gambar');
              }}
              isUploading={uploadStatus.isUploading}
              onRemove={onRemoveImage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostImage;