/**
 * Normalisasi data post untuk memastikan format yang konsisten
 * @param {Object} post - Data post dari API
 * @returns {Object} - Data post yang sudah dinormalisasi
 */
export const normalizePost = (post) => {
  if (!post) return null;
  
  // Normalisasi image
  let normalizedImage = post.image;
  if (typeof post.image === 'object' && post.image !== null) {
    console.warn('Post image is an object, normalizing:', post.image);
    normalizedImage = post.image.path || post.image.url || post.image.src || null;
  }
  
  // Normalisasi labels
  let normalizedLabels = [];
  if (post.labels) {
    if (Array.isArray(post.labels)) {
      normalizedLabels = post.labels.map(label => {
        if (typeof label === 'object' && label !== null) {
          return {
            id: label.id,
            name: label.name || ''
          };
        }
        return {
          id: label,
          name: ''
        };
      });
    } else if (typeof post.labels === 'string') {
      try {
        const parsedLabels = JSON.parse(post.labels);
        if (Array.isArray(parsedLabels)) {
          normalizedLabels = parsedLabels;
        }
      } catch (e) {
        console.error('Error parsing labels string:', e);
      }
    }
  }
  
  // Normalisasi boolean fields
  const normalizedPost = {
    ...post,
    image: normalizedImage,
    labels: normalizedLabels,
    is_featured: post.is_featured === 1 || post.is_featured === true,
    is_spotlight: post.is_spotlight === 1 || post.is_spotlight === true
  };
  
  return normalizedPost;
}; 