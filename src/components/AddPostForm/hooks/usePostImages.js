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
        setPost(prevPost => ({
          ...prevPost,
          image: {
            file: file,
            path: result.filename,
            url: result.url
          }
        }));
        
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
        if (prevPost.imagePreview) {
          URL.revokeObjectURL(prevPost.imagePreview);
        }
        
        if (prevPost.image) {
          deleteImage(prevPost.image).catch(err => {
            console.error('Error deleting image:', err);
          });
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