/**
 * Utility functions for handling image URLs in a consistent way
 * These functions ensure images are loaded from the correct directories:
 * /original, /medium, /thumbnail
 */

/**
 * Get the correct image URL based on the image ID and size
 * @param {string} imageId - The image ID or path
 * @param {string} size - The desired size: 'thumbnail', 'medium', or 'original'
 * @returns {string} The correct image URL
 */
export const getCorrectImageUrl = (imageId, size = 'medium') => {
  if (!imageId) return null;
  
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // If imageId is already a full URL, extract the filename
  if (imageId.startsWith('http')) {
    const urlParts = imageId.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // If filename contains image-*, use it directly
    if (fileName.includes('image-')) {
      return `${apiUrl}/uploads/${fileName}`;
    }
    
    // Otherwise, use the size directory
    return `${apiUrl}/uploads/${size}/${fileName}`;
  }
  
  // If imageId is in the format image-*, use it directly
  if (imageId.includes('image-')) {
    return `${apiUrl}/uploads/${imageId}`;
  }
  
  // Check if we have a cached extension for this image
  let extension = '';
  try {
    if (window.extensionCache && window.extensionCache[imageId]) {
      extension = window.extensionCache[imageId];
    } else {
      // Try to get from localStorage
      const cachedExtensions = localStorage.getItem('imageExtensionCache');
      if (cachedExtensions) {
        const extensionMap = JSON.parse(cachedExtensions);
        if (extensionMap[imageId]) {
          extension = extensionMap[imageId];
          
          // Save to window cache for faster access
          if (!window.extensionCache) window.extensionCache = {};
          window.extensionCache[imageId] = extension;
        }
      }
    }
  } catch (error) {
    console.error('Error accessing extension cache:', error);
  }
  
  // If we have an extension, use it
  if (extension) {
    return `${apiUrl}/uploads/${size}/${imageId}${extension}`;
  }
  
  // Default: use the size directory without extension
  return `${apiUrl}/uploads/${size}/${imageId}`;
};

/**
 * Save an image extension to cache for future use
 * @param {string} imageId - The image ID
 * @param {string} extension - The file extension (e.g., '.jpg')
 */
export const saveImageExtension = (imageId, extension) => {
  if (!imageId || !extension) return;
  
  try {
    // Save to window cache
    if (!window.extensionCache) window.extensionCache = {};
    window.extensionCache[imageId] = extension;
    
    // Save to localStorage
    const cachedExtensions = localStorage.getItem('imageExtensionCache') || '{}';
    const extensionMap = JSON.parse(cachedExtensions);
    extensionMap[imageId] = extension;
    localStorage.setItem('imageExtensionCache', JSON.stringify(extensionMap));
    
    console.log(`Saved extension ${extension} for image ${imageId} to cache`);
  } catch (error) {
    console.error('Error saving extension to cache:', error);
  }
};

/**
 * Fix image URL for components that use ResponsivePostImage
 * This function handles different image formats and ensures they're loaded from the correct directory
 * @param {string} imageUrl - The image URL or ID
 * @returns {string} The fixed image URL or ID
 */
export const fixImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If URL contains 'image-' (old format), use it directly
  if (typeof imageUrl === 'string' && imageUrl.includes('image-')) {
    return imageUrl;
  }
  
  // If URL is already a full URL with the correct structure, use it directly
  if (typeof imageUrl === 'string' && 
      (imageUrl.includes('/uploads/original/') || 
       imageUrl.includes('/uploads/medium/') || 
       imageUrl.includes('/uploads/thumbnail/'))) {
    return imageUrl;
  }
  
  // Otherwise, return the image ID/URL as is for ResponsivePostImage to handle
  return imageUrl;
};

/**
 * Preload an image to ensure it's in the browser cache
 * @param {string} imageUrl - The image URL to preload
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} A promise that resolves when the image is loaded or rejects on error/timeout
 */
export const preloadImage = (imageUrl, timeout = 3000) => {
  if (!imageUrl) return Promise.reject(new Error('No image URL provided'));
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image preload timed out after ${timeout}ms: ${imageUrl}`));
    }, timeout);
    
    // Set up load handler
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };
    
    // Set up error handler
    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    // Start loading the image
    img.src = imageUrl;
  });
};

export default {
  getCorrectImageUrl,
  saveImageExtension,
  fixImageUrl,
  preloadImage
};
