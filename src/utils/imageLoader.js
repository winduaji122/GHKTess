export const getImageUrl = (path, options = {}) => {
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 5)); // Cache for 5 minutes
  return `${path}?v=${timestamp}`;
}; 