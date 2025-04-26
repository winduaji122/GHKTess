/**
 * Utility functions for text manipulation
 */

/**
 * Removes HTML tags from a string
 * @param {string} html - HTML string to strip tags from
 * @returns {string} - Plain text without HTML tags
 */
export const stripHtmlTags = (html) => {
  if (!html) return '';
  
  // Replace HTML tags with empty string
  const plainText = html.replace(/<[^>]*>/g, '');
  
  // Replace multiple spaces with a single space
  return plainText.replace(/\s+/g, ' ').trim();
};

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length of the text
 * @returns {string} - Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Converts a string to title case (first letter of each word capitalized)
 * @param {string} text - Text to convert
 * @returns {string} - Text in title case
 */
export const toTitleCase = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
