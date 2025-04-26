import React, { useMemo, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCloudUploadAlt, FaUser, FaCamera } from 'react-icons/fa';
import { getProfileImageUrl, validateImage } from '../../utils/imageHelper';
import ImagePreview from './ImagePreview';
import UploadProgress from './UploadProgress';
import './ProfileImage.css';

const ProfileImage = ({
  profileImage,
  previewImage,
  uploadStatus = { isUploading: false, progress: 0 },
  onImageChange,
  onRemoveImage
}) => {
  // State untuk drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Menentukan URL gambar yang akan ditampilkan
  const imageUrl = useMemo(() => {
    // Jika ada previewImage, gunakan itu
    if (previewImage) {
      return previewImage;
    }

    // Jika profileImage adalah File object (baru diupload)
    if (profileImage instanceof File) {
      const url = URL.createObjectURL(profileImage);
      return url;
    }

    // Jika profileImage adalah string (path)
    if (typeof profileImage === 'string') {
      return getProfileImageUrl(profileImage);
    }

    return null;
  }, [profileImage, previewImage]);

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

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploadStatus.isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validasi file
      const validation = await validateImage(file);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      // Buat event palsu untuk diproses oleh onImageChange
      const event = {
        target: {
          files: [file]
        }
      };
      onImageChange(event);
    }
  }, [onImageChange, uploadStatus.isUploading]);

  // Fungsi crop telah dihapus



  return (
    <div className="user-profile-image-section">
      <div
        className={`user-profile-image-dropzone ${isDragging ? 'dropzone-active' : ''} ${uploadStatus.isUploading ? 'dropzone-uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="profile-image"
          onChange={onImageChange}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          disabled={uploadStatus.isUploading}
          className="user-profile-image-input"
        />

        {!imageUrl && (
          <div className="user-profile-image-placeholder">
            <FaUser className="user-profile-image-icon" size={50} />
            <p className="user-profile-upload-text">
              {isDragging
                ? 'Lepaskan gambar di sini'
                : 'Tarik & lepaskan gambar di sini atau klik untuk memilih'}
            </p>
            <p className="user-profile-upload-hint">Mendukung JPG, PNG, GIF, dan WEBP (Maks. 5MB)</p>

            <label
              htmlFor="profile-image"
              className="user-profile-upload-button"
            >
              <FaCamera className="user-profile-button-icon" />
              {uploadStatus.isUploading ? 'Mengupload...' : 'Pilih Gambar'}
            </label>
          </div>
        )}

        <UploadProgress status={uploadStatus} />

        {imageUrl && (
          <div className="user-profile-image-preview-container">
            <ImagePreview
              src={imageUrl}
              onError={() => {
                toast.error('Gagal memuat gambar profil');
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

export default ProfileImage;
