export const checkNetworkSpeed = async () => {
  const connection = navigator.connection || 
    navigator.mozConnection || 
    navigator.webkitConnection;
    
  if (connection) {
    return {
      type: connection.effectiveType, // 4g, 3g, etc
      downlink: connection.downlink, // Mbps
      rtt: connection.rtt // ms
    };
  }
  
  return null;
};

export const validateConnection = async () => {
  try {
    const connection = navigator.connection || 
      navigator.mozConnection || 
      navigator.webkitConnection;
      
    if (!navigator.onLine) {
      return {
        isValid: false,
        message: 'Tidak ada koneksi internet'
      };
    }

    if (connection) {
      const speed = connection.downlink; // Mbps
      if (speed < 1) { // Kurang dari 1 Mbps
        return {
          isValid: false,
          message: 'Koneksi internet terlalu lambat untuk upload gambar'
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error checking network:', error);
    return { isValid: true }; // Default ke true jika gagal check
  }
}; 