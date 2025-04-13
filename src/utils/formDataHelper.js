/**
 * Memeriksa dan menampilkan isi FormData
 * @param {FormData} formData - FormData yang akan diperiksa
 * @returns {Object} - Object berisi entries dari FormData
 */
export const inspectFormData = (formData) => {
  if (!(formData instanceof FormData)) {
    console.error('Parameter bukan instance FormData');
    return {};
  }
  
  const entries = {};
  
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      entries[key] = {
        type: 'File',
        name: value.name,
        size: value.size,
        mimeType: value.type,
        lastModified: new Date(value.lastModified).toISOString()
      };
    } else {
      entries[key] = value;
    }
  }
  
  console.log('FormData entries:', entries);
  return entries;
}; 