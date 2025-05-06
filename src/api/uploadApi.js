import { api } from './axios';

/**
 * Upload gambar ke server
 * @param {File} file - File gambar yang akan diupload
 * @param {Function} onProgress - Callback untuk progress upload (opsional)
 * @returns {Promise<Object>} - Response dari server
 */
export const uploadImage = async (file, onProgress) => {
  try {
    if (!file) {
      console.error('No file provided for upload');
      throw new Error('No file provided');
    }

    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const formData = new FormData();
    formData.append('image', file);

    // Log FormData entries untuk debugging
    const formDataEntries = {};
    for (const [key, value] of formData.entries()) {
      formDataEntries[key] = value instanceof File ?
        `File: ${value.name} (${value.size} bytes)` : value;
    }
    console.log('FormData entries:', formDataEntries);

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && typeof onProgress === 'function') {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const timeElapsed = (Date.now() - progressEvent.timeStamp) / 1000;
          const speed = timeElapsed > 0 ? (loaded / timeElapsed / (1024 * 1024)).toFixed(2) : 0;

          onProgress({
            progress: percentCompleted,
            loaded,
            total,
            speed
          });
        }
      }
    });

    console.log('Upload response:', response.data);

    if (response.data.success) {
      // Pastikan path yang dikembalikan adalah string
      let imagePath = null;
      let imageUrl = null;

      // Coba ekstrak path dari berbagai format respons
      if (response.data.path) {
        imagePath = response.data.path;
      } else if (response.data.filename) {
        imagePath = `uploads/${response.data.filename}`;
      } else if (response.data.data && response.data.data.path) {
        imagePath = response.data.data.path;
      } else if (response.data.file && response.data.file.path) {
        imagePath = response.data.file.path;
      } else if (response.data.file && response.data.file.filename) {
        imagePath = `uploads/${response.data.file.filename}`;
      } else if (response.data.image_url) {
        imagePath = response.data.image_url;
      }

      // Coba ekstrak URL lengkap jika ada
      if (response.data.url) {
        imageUrl = response.data.url;
      } else if (response.data.data && response.data.data.url) {
        imageUrl = response.data.data.url;
      }

      if (!imagePath && !imageUrl) {
        console.error('No valid image path or URL in response:', response.data);
        throw new Error('Invalid response format');
      }

      console.log('Extracted image path:', imagePath);
      console.log('Extracted image URL:', imageUrl);

      // Buat URL lengkap jika hanya ada path
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const fullUrl = imageUrl || (imagePath ? `${apiUrl}/${imagePath.replace(/^\//, '')}` : null);

      return {
        success: true,
        path: imagePath,
        url: fullUrl,
        message: response.data.message || 'Upload successful'
      };
    } else {
      console.error('Upload failed:', response.data.message);
      throw new Error(response.data.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      message: error.message || 'Upload failed'
    };
  }
};

/**
 * Menghitung kecepatan upload dalam MB/s
 * @param {ProgressEvent} progressEvent - Event progress dari axios
 * @returns {Number} - Kecepatan dalam MB/s
 */
const calculateSpeed = (progressEvent) => {
  const loaded = progressEvent.loaded;
  const timeElapsed = (Date.now() - progressEvent.timeStamp) / 1000; // dalam detik

  if (timeElapsed > 0) {
    const bytesPerSecond = loaded / timeElapsed;
    const mbPerSecond = bytesPerSecond / (1024 * 1024);
    return mbPerSecond.toFixed(2);
  }

  return 0;
};