import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { uploadImage, deleteImage } from '../../../api/postApi';
import { validateImage } from '../utils/postValidation';

export const usePostImages = ({ setPost, setHasChanges, isEditing }) => {
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    speed: 0,
    error: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageToDelete, setImageToDelete] = useState(null);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus({
        isUploading: true,
        progress: 0,
        speed: 0,
        error: null
      });

      const result = await uploadImage(file, (progressData) => {
        setUploadStatus(prev => ({
          ...prev,
          progress: progressData.progress,
          speed: progressData.speed
        }));
      });

      if (result.success) {
        // Cek apakah result mengandung data gambar dengan format baru (UUID)
        if (result.imageId) {
          // Format baru dengan UUID dan versi gambar
          setPost(prevPost => ({
            ...prevPost,
            image: {
              file: file,
              path: result.imageId, // Gunakan imageId sebagai path
              url: result.url || result.originalUrl,
              thumbnailUrl: result.thumbnailUrl,
              mediumUrl: result.mediumUrl,
              originalUrl: result.originalUrl,
              srcSet: result.srcSet,
              sizes: result.sizes,
              imageId: result.imageId // Simpan imageId untuk digunakan saat update/delete
            }
          }));
        } else {
          // Format lama (fallback)
          setPost(prevPost => ({
            ...prevPost,
            image: {
              file: file,
              path: result.filename || result.path,
              url: result.url
            }
          }));
        }

        setHasChanges(prev => ({
          ...prev,
          image: true
        }));

        toast.success('Gambar berhasil diupload');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Gagal mengupload gambar');

      setUploadStatus(prev => ({
        ...prev,
        error: error.message
      }));
    } finally {
      setUploadStatus(prev => ({
        ...prev,
        isUploading: false
      }));
    }
  };

  const handleRemoveImage = async () => {
    try {
      setPost(prevPost => {
        // Revoke object URL jika ada
        if (prevPost.imagePreview) {
          URL.revokeObjectURL(prevPost.imagePreview);
        }

        // Hapus gambar dari server jika ada
        if (prevPost.image) {
          // Cek apakah image mengandung imageId (format baru)
          if (prevPost.image.imageId) {
            console.log(`Deleting image with ID: ${prevPost.image.imageId}`);
            deleteImage(prevPost.image.imageId).catch(err => {
              console.error('Error deleting image:', err);
            });
          }
          // Cek apakah image mengandung path (format baru atau lama)
          else if (prevPost.image.path) {
            console.log(`Deleting image with path: ${prevPost.image.path}`);
            deleteImage(prevPost.image.path).catch(err => {
              console.error('Error deleting image:', err);
            });
          }
          // Fallback untuk format lama
          else {
            console.log('Deleting image with unknown format:', prevPost.image);
            deleteImage(prevPost.image).catch(err => {
              console.error('Error deleting image:', err);
            });
          }
        }

        return {
          ...prevPost,
          image: null,
          imagePreview: null
        };
      });

      setImagePreview(null);
      setImageFile(null);

      setHasChanges(prev => ({
        ...prev,
        image: true
      }));

      toast.success('Gambar berhasil dihapus');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Gagal menghapus gambar');
    }
  };

  // Cleanup preview URL saat component unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return {
    uploadStatus,
    imagePreview,
    imageFile,
    imageToDelete,
    handleImageChange,
    handleRemoveImage
  };
};