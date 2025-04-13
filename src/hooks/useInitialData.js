import { useQueries } from 'react-query';
import { api } from '../api/axios';
import { toast } from 'react-toastify';

export const useInitialData = (options = {}) => {
  const { 
    includeFeatured = true,
    postsLimit = 10,
    onError 
  } = options;

  const queries = [
    {
      queryKey: ['labels'],
      queryFn: async () => {
        const response = await api.get('/api/labels');
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 menit
      retry: 2,
      onError: (error) => {
        toast.error('Gagal memuat data label');
        onError?.('labels', error);
      }
    },
    {
      queryKey: ['posts', 'all'],
      queryFn: async () => {
        const response = await api.get('/api/posts', {
          params: {
            page: 1,
            limit: postsLimit,
            include_labels: true
          }
        });
        return response.data;
      },
      staleTime: 1000 * 60, // 1 menit
      onError: (error) => {
        toast.error('Gagal memuat daftar post');
        onError?.('posts', error);
      }
    }
  ];

  // Tambahkan query featured posts jika diperlukan
  if (includeFeatured) {
    queries.push({
      queryKey: ['posts', 'featured'],
      queryFn: async () => {
        const response = await api.get('/api/posts', {
          params: {
            featured: true,
            limit: 1
          }
        });
        return response.data;
      },
      staleTime: 1000 * 60,
      onError: (error) => {
        toast.error('Gagal memuat featured post');
        onError?.('featured', error);
      }
    });
  }

  const results = useQueries(queries);

  return {
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
    data: {
      labels: results[0].data,
      posts: results[1].data,
      featuredPost: includeFeatured ? results[2]?.data : null
    },
    refetch: () => results.forEach(r => r.refetch())
  };
}; 