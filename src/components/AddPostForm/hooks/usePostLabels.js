import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getLabels, createLabel, deleteLabel, updateLabel } from '../../../api/labelApi';
import { debounce } from 'lodash';

export const usePostLabels = ({ setPost, setHasChanges, initialLabels = [] }) => {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState(
    Array.isArray(initialLabels) ? initialLabels.map(l => l.id) : []
  );
  const [showUndo, setShowUndo] = useState(false);
  const [deletedLabel, setDeletedLabel] = useState(null);
  const [isLoadingLabels, setIsLoadingLabels] = useState(true);

  const debouncedSetPost = useCallback(
    debounce((newPost) => {
      setPost(newPost);
    }, 300),
    [setPost]
  );

  // Load labels
  useEffect(() => {
    let isMounted = true;
    
    const loadLabels = async () => {  
      try {
        const data = await getLabels();
        if (isMounted) {
          setLabels(Array.isArray(data) ? data : []);
          setIsLoadingLabels(false);
        }
      } catch (error) {
        console.error('Error loading labels:', error);
        if (isMounted) {
          toast.error('Gagal memuat label');
          setIsLoadingLabels(false);
        }
      }
    };
    
    loadLabels();
    return () => { isMounted = false; };
  }, []);

  // Effect untuk menginisialisasi selectedLabels saat post diload
  useEffect(() => {
    if (Array.isArray(initialLabels)) {
      setSelectedLabels(initialLabels.map(l => l.id));
    }
  }, [initialLabels]);

  // Tambahkan cleanup untuk debounced function
  useEffect(() => {
    return () => {
      debouncedSetPost.cancel();
    };
  }, [debouncedSetPost]);

  // Perbaiki handleLabelToggle untuk menghindari re-render berlebihan
  const handleLabelToggle = useCallback((newSelectedLabels) => {
    try {
      // Validasi input
      if (!Array.isArray(newSelectedLabels)) {
        console.warn('newSelectedLabels harus berupa array');
        return;
      }

      setSelectedLabels(newSelectedLabels);
      
      const selectedObjects = labels
        .filter(label => newSelectedLabels.includes(label.id))
        .map(label => ({
          id: label.id,
          label: label.label || label.name
        }));

      // Gunakan debouncedSetPost untuk mengurangi re-render
      debouncedSetPost(prevPost => ({
        ...prevPost,
        labels: selectedObjects
      }));

      // Update hasChanges setelah debounce
      setHasChanges(prev => ({
        ...prev,
        labels: true
      }));
    } catch (error) {
      console.error('Error in handleLabelToggle:', error);
      toast.error('Terjadi kesalahan saat mengupdate label');
    }
  }, [labels, debouncedSetPost, setHasChanges]);

  const handleLabelCreate = useCallback(async (name) => {
    try {
      const newLabel = await createLabel({ name });
      setLabels(prev => [...prev, newLabel]);
      handleLabelToggle([...selectedLabels, newLabel.id]);
      toast.success('Label berhasil dibuat');
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('Gagal membuat label');
    }
  }, [selectedLabels, handleLabelToggle]);

  const handleLabelEdit = useCallback(async (labelId, newName) => {
    try {
      const updatedLabel = await updateLabel(labelId, { name: newName });
      setLabels(prev => prev.map(label => 
        label.id === labelId ? updatedLabel : label
      ));
      toast.success('Label berhasil diperbarui');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Gagal memperbarui label');
    }
  }, []);

  const handleLabelDelete = useCallback(async (labelId) => {
    try {
      const labelToDelete = labels.find(l => l.id === labelId);
      await deleteLabel(labelId);
      
      setLabels(prev => prev.filter(l => l.id !== labelId));
      handleLabelToggle(selectedLabels.filter(id => id !== labelId));
      
      setDeletedLabel(labelToDelete);
      setShowUndo(true);
      
      setTimeout(() => {
        setShowUndo(false);
        setDeletedLabel(null);
      }, 5000);
      
      toast.success('Label berhasil dihapus');
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error('Gagal menghapus label');
    }
  }, [labels, selectedLabels, handleLabelToggle]);

  const handleUndo = useCallback(async () => {
    if (!deletedLabel) return;
    
    try {
      const restoredLabel = await createLabel({
        name: deletedLabel.label || deletedLabel.name
      });
      
      setLabels(prev => [...prev, restoredLabel]);
      handleLabelToggle([...selectedLabels, restoredLabel.id]);
      
      setShowUndo(false);
      setDeletedLabel(null);
      
      toast.success('Label berhasil dipulihkan');
    } catch (error) {
      console.error('Error restoring label:', error);
      toast.error('Gagal memulihkan label');
    }
  }, [deletedLabel, selectedLabels, handleLabelToggle]);

  return {
    labels,
    selectedLabels,
    showUndo,
    isLoadingLabels,
    handleLabelToggle,
    handleLabelCreate,
    handleLabelDelete,
    handleLabelEdit,
    handleUndo
  };
};