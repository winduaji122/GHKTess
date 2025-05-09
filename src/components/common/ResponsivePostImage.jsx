import React from 'react';
import SimplifiedResponsivePostImage from './SimplifiedResponsivePostImage';

/**
 * @deprecated Use SimplifiedResponsivePostImage instead
 */

/**
 * Komponen ResponsivePostImage khusus untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 * @param {string} size - Ukuran gambar yang akan digunakan: 'thumbnail', 'medium', atau 'original'
 */
const ResponsivePostImage = (props) => {
  // Gunakan SimplifiedResponsivePostImage sebagai pengganti
  return <SimplifiedResponsivePostImage {...props} />;
};



export default ResponsivePostImage;
