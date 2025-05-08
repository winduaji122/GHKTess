import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveImage from './ResponsiveImage';
import { getImageUrl } from '../../utils/imageHelper';

/**
 * Komponen ResponsivePostImage khusus untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 * @param {string} size - Ukuran gambar yang akan digunakan: 'thumbnail', 'medium', atau 'original'
 */
const ResponsivePostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '100%',
  height = '200px',
  objectFit = 'cover',
  priority = false,
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  size = 'auto' // 'auto', 'thumbnail', 'medium', atau 'original'
}) => {
  const [imageInfo, setImageInfo] = useState({
    main: null,
    thumbnail: null,
    medium: null,
    srcSet: null,
    sizes: null
  });

  // Fungsi untuk mengekstrak informasi gambar dari URL
  const extractImageInfo = useCallback((imagePath) => {
    if (!imagePath) {
      return {
        main: fallbackSrc,
        thumbnail: null,
        medium: null,
        srcSet: null,
        sizes: null
      };
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Jika imagePath adalah objek dengan properti dari API baru
    if (typeof imagePath === 'object' && imagePath !== null) {
      // Jika objek memiliki properti original_path, thumbnail_path, medium_path (dari database)
      if (imagePath.original_path || imagePath.thumbnail_path || imagePath.medium_path) {
        // Gunakan path langsung dari database
        const originalUrl = imagePath.original_path ? `${apiUrl}/${imagePath.original_path}` : null;
        const mediumUrl = imagePath.medium_path ? `${apiUrl}/${imagePath.medium_path}` : null;
        const thumbnailUrl = imagePath.thumbnail_path ? `${apiUrl}/${imagePath.thumbnail_path}` : null;

        // Tentukan main berdasarkan parameter size dan dimensi komponen
        let mainUrl;
        if (size === 'thumbnail' && thumbnailUrl) {
          mainUrl = thumbnailUrl;
        } else if (size === 'medium' && mediumUrl) {
          mainUrl = mediumUrl;
        } else if (size === 'original' && originalUrl) {
          mainUrl = originalUrl;
        } else if (size === 'auto') {
          // Auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200 && thumbnailUrl) {
            mainUrl = thumbnailUrl;
          } else if (parseInt(height) <= 640 && mediumUrl) {
            mainUrl = mediumUrl;
          } else {
            mainUrl = originalUrl;
          }
        } else {
          // Default ke original
          mainUrl = originalUrl || mediumUrl || thumbnailUrl;
        }

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          original: originalUrl,
          srcSet: thumbnailUrl && mediumUrl && originalUrl ?
            `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w` : null,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika objek memiliki properti url, thumbnailUrl, mediumUrl (dari API)
      if (imagePath.url || imagePath.thumbnailUrl || imagePath.mediumUrl) {
        // Tentukan main berdasarkan parameter size
        let mainUrl;
        if (size === 'thumbnail' && imagePath.thumbnailUrl) {
          mainUrl = imagePath.thumbnailUrl;
        } else if (size === 'medium' && imagePath.mediumUrl) {
          mainUrl = imagePath.mediumUrl;
        } else if (size === 'original' && imagePath.url) {
          mainUrl = imagePath.url;
        } else if (size === 'auto') {
          // Auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200 && imagePath.thumbnailUrl) {
            mainUrl = imagePath.thumbnailUrl;
          } else if (parseInt(height) <= 640 && imagePath.mediumUrl) {
            mainUrl = imagePath.mediumUrl;
          } else {
            mainUrl = imagePath.url || imagePath.path;
          }
        } else {
          // Default ke original
          mainUrl = imagePath.url || imagePath.mediumUrl || imagePath.thumbnailUrl || imagePath.path;
        }

        return {
          main: mainUrl,
          thumbnail: imagePath.thumbnailUrl,
          medium: imagePath.mediumUrl,
          original: imagePath.url,
          srcSet: imagePath.srcSet,
          sizes: imagePath.sizes || "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika hanya ada path
      if (imagePath.path) {
        const url = getImageUrl(imagePath.path);
        return {
          main: url,
          thumbnail: null,
          medium: null,
          original: null,
          srcSet: null,
          sizes: null
        };
      }
    }

    // Jika imagePath adalah string
    if (typeof imagePath === 'string') {
      // Cek apakah ini adalah UUID (format baru)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(imagePath)) {
        // Ini adalah ID gambar, coba cari di cache terlebih dahulu
        if (window.imageCache && window.imageCache.has(imagePath)) {
          const cachedUrls = window.imageCache.get(imagePath);
          console.log('Using cached image URLs for:', imagePath);

          // Tentukan main URL berdasarkan parameter size
          let mainUrl;
          if (size === 'thumbnail') {
            mainUrl = cachedUrls.thumbnail;
          } else if (size === 'medium') {
            mainUrl = cachedUrls.medium;
          } else if (size === 'original') {
            mainUrl = cachedUrls.original;
          } else if (size === 'auto') {
            // Auto: pilih berdasarkan dimensi komponen
            if (parseInt(height) <= 200) {
              mainUrl = cachedUrls.thumbnail;
            } else if (parseInt(height) <= 640) {
              mainUrl = cachedUrls.medium;
            } else {
              mainUrl = cachedUrls.original;
            }
          } else {
            // Default ke original
            mainUrl = cachedUrls.original || cachedUrls.medium || cachedUrls.thumbnail;
          }

          return {
            main: mainUrl,
            thumbnail: cachedUrls.thumbnail,
            medium: cachedUrls.medium,
            original: cachedUrls.original,
            srcSet: `${cachedUrls.thumbnail} 200w, ${cachedUrls.medium} 640w, ${cachedUrls.original} 1200w`,
            sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
          };
        }

        // Jika tidak ada di cache, coba cari di database
        try {
          // Coba ambil data gambar dari database
          const imageData = window.imageDatabase ? window.imageDatabase.find(img => img.id === imagePath) : null;

          if (imageData) {
            // Gunakan path dari database
            const originalUrl = `${apiUrl}/${imageData.original_path}`;
            const mediumUrl = `${apiUrl}/${imageData.medium_path}`;
            const thumbnailUrl = `${apiUrl}/${imageData.thumbnail_path}`;

            // Simpan ke cache untuk penggunaan berikutnya
            if (!window.imageCache) {
              window.imageCache = new Map();
            }
            window.imageCache.set(imagePath, {
              original: originalUrl,
              medium: mediumUrl,
              thumbnail: thumbnailUrl
            });

            // Tentukan main URL berdasarkan parameter size
            let mainUrl;
            if (size === 'thumbnail') {
              mainUrl = thumbnailUrl;
            } else if (size === 'medium') {
              mainUrl = mediumUrl;
            } else if (size === 'original') {
              mainUrl = originalUrl;
            } else if (size === 'auto') {
              // Auto: pilih berdasarkan dimensi komponen
              if (parseInt(height) <= 200) {
                mainUrl = thumbnailUrl;
              } else if (parseInt(height) <= 640) {
                mainUrl = mediumUrl;
              } else {
                mainUrl = originalUrl;
              }
            } else {
              // Default ke original
              mainUrl = originalUrl || mediumUrl || thumbnailUrl;
            }

            return {
              main: mainUrl,
              thumbnail: thumbnailUrl,
              medium: mediumUrl,
              original: originalUrl,
              srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
              sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
            };
          }
        } catch (error) {
          console.error('Error accessing image database:', error);
        }

        // Fallback jika tidak ada database atau gambar tidak ditemukan
        // Gunakan URL langsung ke file tanpa ekstensi
        const originalUrl = `${apiUrl}/uploads/original/${imagePath}`;
        const mediumUrl = `${apiUrl}/uploads/medium/${imagePath}`;
        const thumbnailUrl = `${apiUrl}/uploads/thumbnail/${imagePath}`;

        // Tentukan main URL berdasarkan parameter size
        let mainUrl;
        if (size === 'thumbnail') {
          mainUrl = thumbnailUrl;
        } else if (size === 'medium') {
          mainUrl = mediumUrl;
        } else if (size === 'original') {
          mainUrl = originalUrl;
        } else if (size === 'auto') {
          // Auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200) {
            mainUrl = thumbnailUrl;
          } else if (parseInt(height) <= 640) {
            mainUrl = mediumUrl;
          } else {
            mainUrl = originalUrl;
          }
        } else {
          // Default ke original
          mainUrl = originalUrl;
        }

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          original: originalUrl,
          srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika URL sudah mengandung /uploads/original/, /uploads/medium/, atau /uploads/thumbnail/
      if (imagePath.includes('/uploads/original/') || imagePath.includes('/uploads/medium/') || imagePath.includes('/uploads/thumbnail/')) {
        // Ekstrak ID dari URL
        const parts = imagePath.split('/');
        const imageId = parts[parts.length - 1].split('?')[0]; // Hapus parameter query jika ada

        // Hapus ekstensi jika ada
        const cleanImageId = imageId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

        // Buat URL untuk setiap ukuran
        const originalUrl = `${apiUrl}/uploads/original/${cleanImageId}`;
        const mediumUrl = `${apiUrl}/uploads/medium/${cleanImageId}`;
        const thumbnailUrl = `${apiUrl}/uploads/thumbnail/${cleanImageId}`;

        // Tentukan main URL berdasarkan parameter size
        let mainUrl;
        if (size === 'thumbnail') {
          mainUrl = thumbnailUrl;
        } else if (size === 'medium') {
          mainUrl = mediumUrl;
        } else if (size === 'original') {
          mainUrl = originalUrl;
        } else if (size === 'auto') {
          // Auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200) {
            mainUrl = thumbnailUrl;
          } else if (parseInt(height) <= 640) {
            mainUrl = mediumUrl;
          } else {
            mainUrl = originalUrl;
          }
        } else {
          // Default ke URL asli
          mainUrl = imagePath;
        }

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          original: originalUrl,
          srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika URL mengandung /api/images/
      if (imagePath.includes('/api/images/')) {
        // Ekstrak ID dari URL API
        const match = imagePath.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
        if (match && match[1]) {
          const imageId = match[1];

          // Buat URL langsung ke file
          const originalUrl = `${apiUrl}/uploads/original/${imageId}`;
          const mediumUrl = `${apiUrl}/uploads/medium/${imageId}`;
          const thumbnailUrl = `${apiUrl}/uploads/thumbnail/${imageId}`;

          // Tentukan main URL berdasarkan parameter size
          let mainUrl;
          if (size === 'thumbnail') {
            mainUrl = thumbnailUrl;
          } else if (size === 'medium') {
            mainUrl = mediumUrl;
          } else if (size === 'original') {
            mainUrl = originalUrl;
          } else if (size === 'auto') {
            // Auto: pilih berdasarkan dimensi komponen
            if (parseInt(height) <= 200) {
              mainUrl = thumbnailUrl;
            } else if (parseInt(height) <= 640) {
              mainUrl = mediumUrl;
            } else {
              mainUrl = originalUrl;
            }
          } else {
            // Default ke URL asli
            mainUrl = imagePath;
          }

          return {
            main: mainUrl,
            thumbnail: thumbnailUrl,
            medium: mediumUrl,
            original: originalUrl,
            srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
            sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
          };
        }
      }

      // Fallback: gunakan getImageUrl dengan parameter size
      const url = getImageUrl(imagePath, null, size);

      return {
        main: url,
        thumbnail: null,
        medium: null,
        original: null,
        srcSet: null,
        sizes: null
      };
    }

    // Fallback default
    return {
      main: fallbackSrc,
      thumbnail: null,
      medium: null,
      original: null,
      srcSet: null,
      sizes: null
    };
  }, [fallbackSrc, height, size]);

  // Inisialisasi database gambar jika belum ada
  useEffect(() => {
    if (!window.imageDatabase && typeof window !== 'undefined') {
      // Coba ambil dari localStorage
      try {
        const cachedData = localStorage.getItem('imageDatabase');
        if (cachedData) {
          window.imageDatabase = JSON.parse(cachedData);
          console.log('Loaded image database from localStorage:', window.imageDatabase.length, 'images');

          // Inisialisasi cache gambar jika belum ada
          if (!window.imageCache) {
            window.imageCache = new Map();
          }

          // Pre-cache URL gambar untuk mempercepat loading
          window.imageDatabase.forEach(img => {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

            // Cache URL untuk setiap ukuran
            const originalUrl = `${apiUrl}/${img.original_path}`;
            const mediumUrl = `${apiUrl}/${img.medium_path}`;
            const thumbnailUrl = `${apiUrl}/${img.thumbnail_path}`;

            // Simpan ke cache dengan ID sebagai key
            window.imageCache.set(img.id, {
              original: originalUrl,
              medium: mediumUrl,
              thumbnail: thumbnailUrl
            });

            // Cache juga dengan nama file sebagai key untuk format lama
            const originalFilename = img.original_path.split('/').pop();
            if (originalFilename) {
              window.imageCache.set(originalFilename, {
                original: originalUrl,
                medium: mediumUrl,
                thumbnail: thumbnailUrl
              });
            }
          });

          console.log('Image cache initialized with', window.imageCache.size, 'entries');
        }
      } catch (error) {
        console.error('Error loading image database from localStorage:', error);
      }

      // Jika tidak ada di localStorage, coba ambil dari server
      if (!window.imageDatabase) {
        const fetchImageDatabase = async () => {
          try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${apiUrl}/api/images/database`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && Array.isArray(data.images)) {
                window.imageDatabase = data.images;
                console.log('Loaded image database from server:', window.imageDatabase.length, 'images');

                // Inisialisasi cache gambar jika belum ada
                if (!window.imageCache) {
                  window.imageCache = new Map();
                }

                // Pre-cache URL gambar untuk mempercepat loading
                window.imageDatabase.forEach(img => {
                  // Cache URL untuk setiap ukuran
                  const originalUrl = `${apiUrl}/${img.original_path}`;
                  const mediumUrl = `${apiUrl}/${img.medium_path}`;
                  const thumbnailUrl = `${apiUrl}/${img.thumbnail_path}`;

                  // Simpan ke cache dengan ID sebagai key
                  window.imageCache.set(img.id, {
                    original: originalUrl,
                    medium: mediumUrl,
                    thumbnail: thumbnailUrl
                  });

                  // Cache juga dengan nama file sebagai key untuk format lama
                  const originalFilename = img.original_path.split('/').pop();
                  if (originalFilename) {
                    window.imageCache.set(originalFilename, {
                      original: originalUrl,
                      medium: mediumUrl,
                      thumbnail: thumbnailUrl
                    });
                  }
                });

                console.log('Image cache initialized with', window.imageCache.size, 'entries');

                // Simpan ke localStorage untuk penggunaan berikutnya
                try {
                  localStorage.setItem('imageDatabase', JSON.stringify(data.images));
                } catch (error) {
                  console.error('Error saving image database to localStorage:', error);
                }
              }
            } else {
              // Jika gagal mengambil dari server, coba gunakan data statis
              try {
                // Gunakan data dari DATABASE TABLE/images.json
                const staticData = [
                  {"id":"970dea2a-3f47-4c3b-a622-b7b3617f0ccd", "original_path":"uploads/original/970dea2a-3f47-4c3b-a622-b7b3617f0ccd.jpg", "thumbnail_path":"uploads/thumbnail/970dea2a-3f47-4c3b-a622-b7b3617f0ccd.jpg", "medium_path":"uploads/medium/970dea2a-3f47-4c3b-a622-b7b3617f0ccd.jpg"},
                  {"id":"a2bc34ca-0d83-40fd-9008-a519a2964a2d", "original_path":"uploads/original/a2bc34ca-0d83-40fd-9008-a519a2964a2d.png", "thumbnail_path":"uploads/thumbnail/a2bc34ca-0d83-40fd-9008-a519a2964a2d.png", "medium_path":"uploads/medium/a2bc34ca-0d83-40fd-9008-a519a2964a2d.png"},
                  {"id":"3a935786-bfb4-46bb-b1c3-4505db2c7827", "original_path":"uploads/original/3a935786-bfb4-46bb-b1c3-4505db2c7827.jpeg", "thumbnail_path":"uploads/thumbnail/3a935786-bfb4-46bb-b1c3-4505db2c7827.jpeg", "medium_path":"uploads/medium/3a935786-bfb4-46bb-b1c3-4505db2c7827.jpeg"},
                  {"id":"6e965d95-1ec6-40e9-83b3-703b7bfd52df", "original_path":"uploads/original/6e965d95-1ec6-40e9-83b3-703b7bfd52df.jpg", "thumbnail_path":"uploads/thumbnail/6e965d95-1ec6-40e9-83b3-703b7bfd52df.jpg", "medium_path":"uploads/medium/6e965d95-1ec6-40e9-83b3-703b7bfd52df.jpg"},
                  {"id":"1e1896a9-40eb-4d45-bdda-6004e6b1dfa0", "original_path":"uploads/original/1e1896a9-40eb-4d45-bdda-6004e6b1dfa0.webp", "thumbnail_path":"uploads/thumbnail/1e1896a9-40eb-4d45-bdda-6004e6b1dfa0.webp", "medium_path":"uploads/medium/1e1896a9-40eb-4d45-bdda-6004e6b1dfa0.webp"},
                  {"id":"9203f2d3-a8e7-49d7-9904-2a467c4b5d04", "original_path":"uploads/original/9203f2d3-a8e7-49d7-9904-2a467c4b5d04.webp", "thumbnail_path":"uploads/thumbnail/9203f2d3-a8e7-49d7-9904-2a467c4b5d04.webp", "medium_path":"uploads/medium/9203f2d3-a8e7-49d7-9904-2a467c4b5d04.webp"},
                  {"id":"4d8666de-26a3-49e3-aab3-2fad7ddeee2b", "original_path":"uploads/original/4d8666de-26a3-49e3-aab3-2fad7ddeee2b", "thumbnail_path":"uploads/thumbnail/4d8666de-26a3-49e3-aab3-2fad7ddeee2b", "medium_path":"uploads/medium/4d8666de-26a3-49e3-aab3-2fad7ddeee2b"},
                  {"id":"63982c1a-1e97-4364-a3fd-41f9edfdfa1c", "original_path":"uploads/original/63982c1a-1e97-4364-a3fd-41f9edfdfa1c", "thumbnail_path":"uploads/thumbnail/63982c1a-1e97-4364-a3fd-41f9edfdfa1c", "medium_path":"uploads/medium/63982c1a-1e97-4364-a3fd-41f9edfdfa1c"},
                  // Tambahkan data gambar yang sering muncul di log error
                  {"id":"d59f5a2c-31c8-49a4-8766-8c36ee25e20b", "original_path":"uploads/original/d59f5a2c-31c8-49a4-8766-8c36ee25e20b.jpg", "thumbnail_path":"uploads/thumbnail/d59f5a2c-31c8-49a4-8766-8c36ee25e20b.jpg", "medium_path":"uploads/medium/d59f5a2c-31c8-49a4-8766-8c36ee25e20b.jpg"},
                  {"id":"fa2f8169-2d32-44b9-b41d-94cc25366bf4", "original_path":"uploads/original/fa2f8169-2d32-44b9-b41d-94cc25366bf4.jpg", "thumbnail_path":"uploads/thumbnail/fa2f8169-2d32-44b9-b41d-94cc25366bf4.jpg", "medium_path":"uploads/medium/fa2f8169-2d32-44b9-b41d-94cc25366bf4.jpg"},
                  {"id":"d39520cd-6675-4e11-b3ea-304af7ff20a7", "original_path":"uploads/original/d39520cd-6675-4e11-b3ea-304af7ff20a7.jpg", "thumbnail_path":"uploads/thumbnail/d39520cd-6675-4e11-b3ea-304af7ff20a7.jpg", "medium_path":"uploads/medium/d39520cd-6675-4e11-b3ea-304af7ff20a7.jpg"},
                  {"id":"e3fc5876-8d08-48f1-b774-800a12c13823", "original_path":"uploads/original/e3fc5876-8d08-48f1-b774-800a12c13823.jpg", "thumbnail_path":"uploads/thumbnail/e3fc5876-8d08-48f1-b774-800a12c13823.jpg", "medium_path":"uploads/medium/e3fc5876-8d08-48f1-b774-800a12c13823.jpg"},
                  // Tambahkan data untuk image-1746675664601-311424452.gif
                  {"id":"image-1746675664601-311424452", "original_path":"uploads/original/image-1746675664601-311424452.gif", "thumbnail_path":"uploads/thumbnail/image-1746675664601-311424452.gif", "medium_path":"uploads/medium/image-1746675664601-311424452.gif"}
                ];

                window.imageDatabase = staticData;
                console.log('Using static image database:', staticData.length, 'images');

                // Inisialisasi cache gambar jika belum ada
                if (!window.imageCache) {
                  window.imageCache = new Map();
                }

                // Pre-cache URL gambar untuk mempercepat loading
                const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
                staticData.forEach(img => {
                  // Cache URL untuk setiap ukuran
                  const originalUrl = `${apiUrl}/${img.original_path}`;
                  const mediumUrl = `${apiUrl}/${img.medium_path}`;
                  const thumbnailUrl = `${apiUrl}/${img.thumbnail_path}`;

                  // Simpan ke cache dengan ID sebagai key
                  window.imageCache.set(img.id, {
                    original: originalUrl,
                    medium: mediumUrl,
                    thumbnail: thumbnailUrl
                  });

                  // Cache juga dengan nama file sebagai key untuk format lama
                  const originalFilename = img.original_path.split('/').pop();
                  if (originalFilename) {
                    window.imageCache.set(originalFilename, {
                      original: originalUrl,
                      medium: mediumUrl,
                      thumbnail: thumbnailUrl
                    });
                  }
                });

                console.log('Image cache initialized with', window.imageCache.size, 'entries from static data');

                // Simpan ke localStorage untuk penggunaan berikutnya
                try {
                  localStorage.setItem('imageDatabase', JSON.stringify(staticData));
                } catch (error) {
                  console.error('Error saving static image database to localStorage:', error);
                }
              } catch (error) {
                console.error('Error using static image database:', error);
              }
            }
          } catch (error) {
            console.error('Error fetching image database:', error);
          }
        };

        fetchImageDatabase();
      }
    }
  }, []);

  // Update imageInfo saat src berubah
  useEffect(() => {
    setImageInfo(extractImageInfo(src));
  }, [src, extractImageInfo]);

  return (
    <ResponsiveImage
      src={imageInfo.main}
      thumbnailSrc={imageInfo.thumbnail}
      mediumSrc={imageInfo.medium}
      srcSet={imageInfo.srcSet}
      sizes={imageInfo.sizes}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      onError={onError}
      fallbackSrc={fallbackSrc}
      loading={priority ? 'eager' : 'lazy'}
      formats={imageInfo.formats}
    />
  );
};

export default ResponsivePostImage;
