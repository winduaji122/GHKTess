import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../api/axios';
import { toast } from 'react-toastify';

export const useLabels = () => {
  const queryClient = useQueryClient();

  // Query untuk fetch labels
  const { 
    data: labels = [], 
    isLoading, 
    error 
  } = useQuery(
    'labels',
    async () => {
      const response = await api.get('/api/labels');
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 5, // 5 menit
      cacheTime: 1000 * 60 * 30, // 30 menit
      retry: 2,
      onError: (error) => {
        toast.error('Gagal memuat label');
        console.error('Error fetching labels:', error);
      }
    }
  );

  // Mutation untuk create label
  const createLabelMutation = useMutation(
    async (newLabel) => {
      const response = await api.post('/api/labels', newLabel);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('labels');
        toast.success('Label berhasil ditambahkan');
      },
      onError: (error) => {
        toast.error('Gagal menambahkan label');
        console.error('Error creating label:', error);
      }
    }
  );

  // Mutation untuk delete label
  const deleteLabelMutation = useMutation(
    async (labelId) => {
      await api.delete(`/api/labels/${labelId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('labels');
        toast.success('Label berhasil dihapus');
      }
    }
  );

  return {
    labels,
    isLoading,
    error,
    createLabel: createLabelMutation.mutate,
    deleteLabel: deleteLabelMutation.mutate,
    isCreating: createLabelMutation.isLoading,
    isDeleting: deleteLabelMutation.isLoading
  };
};
