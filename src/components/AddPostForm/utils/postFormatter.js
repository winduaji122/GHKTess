import DOMPurify from 'dompurify';
import moment from 'moment';

export const cleanAndTruncateExcerpt = (content, maxLength = 500) => {
  const cleanContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
  const trimmedContent = cleanContent.replace(/\s+/g, ' ').trim();
  
  return trimmedContent.length > maxLength 
    ? trimmedContent.substr(0, maxLength - 3) + '...' 
    : trimmedContent;
};

export const formatDateTimeForInput = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Cek apakah tanggal valid
  if (isNaN(d.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }
  
  // Format: YYYY-MM-DDThh:mm
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatDateTimeForDisplay = (date) => {
  return moment(date).format('DD MMMM YYYY, HH:mm');
};

export const sanitizeContent = (content) => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3',
      'ul', 'ol', 'li', 'blockquote', 'img'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt']
  });
};