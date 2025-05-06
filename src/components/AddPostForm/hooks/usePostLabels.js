import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  createLabel,
  updateLabel,
  deleteLabel,
  getLabelsWithSublabels
} from '../../../api/labelApi';

/**
 * Custom hook untuk mengelola label post
 * @param {Object} options - Opsi konfigurasi
 * @param {Array} options.initialSelectedLabels - Array ID label yang sudah dipilih
 * @param {Function} options.onLabelsChange - Callback saat label berubah
 * @returns {Object} - State dan fungsi untuk mengelola label
 */
export const usePostLabels = ({ initialSelectedLabels = [], onLabelsChange }) => {
  // State untuk menyimpan semua label
  const [labels, setLabels] = useState([]);

  // State untuk menyimpan label yang dipilih
  // Pastikan initialSelectedLabels adalah array of numbers
  const normalizedInitialLabels = Array.isArray(initialSelectedLabels)
    ? initialSelectedLabels.map(id => typeof id === 'string' ? parseInt(id) : id)
    : [];

  const [selectedLabels, setSelectedLabels] = useState(normalizedInitialLabels);

  // State untuk loading
  const [isLoading, setIsLoading] = useState(false);

  // State untuk undo
  const [undoState, setUndoState] = useState({
    show: false,
    label: null,
    timer: null
  });

  /**
   * Fungsi untuk memuat label dari server
   */
  const loadLabels = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLabelsWithSublabels();

      // Format data label
      let formattedLabels = [];

      if (Array.isArray(data) && data.length > 0 && 'sublabels' in data[0]) {
        // Format jika data memiliki struktur sublabel
        data.forEach(mainLabel => {
          // Tambahkan main label
          formattedLabels.push({
            ...mainLabel,
            id: parseInt(mainLabel.id),
            is_sublabel: false
          });

          // Tambahkan sublabel jika ada
          if (mainLabel.sublabels && Array.isArray(mainLabel.sublabels)) {
            mainLabel.sublabels.forEach(sublabel => {
              formattedLabels.push({
                ...sublabel,
                id: parseInt(sublabel.id),
                parent_id: parseInt(mainLabel.id),
                is_sublabel: true,
                parent_label: mainLabel.label
              });
            });
          }
        });
      } else {
        // Format jika data tidak memiliki struktur sublabel
        formattedLabels = Array.isArray(data) ? data.map(label => ({
          ...label,
          id: parseInt(label.id),
          parent_id: label.parent_id ? parseInt(label.parent_id) : null,
          is_sublabel: !!label.parent_id
        })) : [];
      }

      setLabels(formattedLabels);
    } catch (error) {
      console.error('Error loading labels:', error);
      toast.error('Gagal memuat label');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fungsi untuk menangani perubahan label yang dipilih
   * @param {Array} newSelectedLabels - Array ID label yang dipilih
   */
  const handleLabelToggle = useCallback((newSelectedLabels) => {
    // Pastikan semua ID adalah number
    const normalizedLabels = newSelectedLabels.map(id =>
      typeof id === 'string' ? parseInt(id) : id
    );

    setSelectedLabels(normalizedLabels);

    // Panggil callback jika ada
    if (onLabelsChange) {
      onLabelsChange(normalizedLabels);
    }
  }, [onLabelsChange]);

  /**
   * Fungsi untuk membuat label baru
   * @param {string} name - Nama label
   * @param {number|null} parentId - ID parent label (untuk sublabel)
   * @returns {Promise<Object>} - Label baru yang dibuat
   */
  const handleLabelCreate = useCallback(async (name, parentId = null) => {
    try {
      // Validasi input
      if (!name || !name.trim()) {
        toast.error('Nama label tidak boleh kosong');
        return null;
      }

      // Kirim data ke server
      const labelData = {
        label: name.trim(),
        parent_id: parentId ? parseInt(parentId) : null
      };

      const newLabel = await createLabel(labelData);

      // Format label untuk konsistensi
      const formattedLabel = {
        id: parseInt(newLabel.id),
        label: newLabel.label || name,
        name: newLabel.label || newLabel.name || name,
        parent_id: parentId ? parseInt(parentId) : null,
        is_sublabel: !!parentId,
        slug: newLabel.slug || name.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w\\-]+/g, '')
      };

      // Tambahkan parent_label jika ini adalah sublabel
      if (parentId) {
        const parentLabel = labels.find(l => l.id === parseInt(parentId));
        if (parentLabel) {
          formattedLabel.parent_label = parentLabel.label || parentLabel.name;
        }
      }

      // Update state
      setLabels(prev => {
        // Tambahkan label baru ke array
        const newLabels = [...prev, formattedLabel];

        // Jika ini adalah sublabel, pastikan parent label sudah di-expand
        if (parentId) {
          // Auto-expand parent label akan ditangani oleh event listener di LabelDropdown
        }

        // Sort labels berdasarkan nama untuk konsistensi
        return newLabels.sort((a, b) => a.label.localeCompare(b.label));
      });

      // Tambahkan ke selected labels
      handleLabelToggle([...selectedLabels, formattedLabel.id]);

      // Tampilkan notifikasi
      toast.success(`${parentId ? 'Sublabel' : 'Label'} berhasil dibuat`);

      // Trigger custom event untuk memberi tahu komponen lain
      if (parentId) {
        // Gunakan event sublabel-added untuk konsistensi dengan event listener di LabelDropdown
        window.dispatchEvent(new CustomEvent('sublabel-added', {
          detail: {
            parentId: parseInt(parentId),
            sublabel: formattedLabel
          }
        }));
      }

      return formattedLabel;
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('Gagal membuat label');
      return null;
    }
  }, [labels, selectedLabels, handleLabelToggle]);

  /**
   * Fungsi untuk mengedit label
   * @param {number} labelId - ID label yang akan diedit
   * @param {string} newName - Nama baru untuk label
   * @returns {Promise<Object>} - Label yang diperbarui
   */
  const handleLabelEdit = useCallback(async (labelId, newName) => {
    try {
      // Validasi input
      if (!newName || !newName.trim()) {
        toast.error('Nama label tidak boleh kosong');
        return null;
      }

      const numericLabelId = parseInt(labelId);

      // Cari label yang akan diedit
      const labelToEdit = labels.find(l => l.id === numericLabelId);
      if (!labelToEdit) {
        toast.error('Label tidak ditemukan');
        return null;
      }

      // Kirim data ke server
      const updateData = {
        label: newName.trim(),
        parent_id: labelToEdit.parent_id
      };

      try {
        const updatedLabel = await updateLabel(numericLabelId, updateData);

        // Format label untuk konsistensi
        const formattedLabel = {
          ...labelToEdit,
          id: numericLabelId,
          label: updatedLabel.label || newName,
          name: updatedLabel.label || updatedLabel.name || newName
        };

        // Update state
        setLabels(prev => prev.map(label =>
          label.id === numericLabelId ? formattedLabel : label
        ));

        // Tampilkan notifikasi
        toast.success(`${labelToEdit.is_sublabel ? 'Sublabel' : 'Label'} berhasil diperbarui`);

        return formattedLabel;
      } catch (apiError) {
        console.error('API error updating label:', apiError);

        // Jika error 401 (Unauthorized), coba refresh token dan coba lagi
        if (apiError.response?.status === 401) {
          toast.error('Sesi telah berakhir. Silakan login kembali.');
        } else {
          toast.error(`Gagal memperbarui label: ${apiError.message || 'Unknown error'}`);
        }

        return null;
      }
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Gagal memperbarui label');
      return null;
    }
  }, [labels]);

  /**
   * Fungsi untuk menghapus label
   * @param {number} labelId - ID label yang akan dihapus
   */
  const handleLabelDelete = useCallback(async (labelId) => {
    try {
      const numericLabelId = parseInt(labelId);

      // Cari label yang akan dihapus
      const labelToDelete = labels.find(l => l.id === numericLabelId);
      if (!labelToDelete) {
        toast.error('Label tidak ditemukan');
        return;
      }

      // Cari sublabel yang terkait dengan label ini
      const sublabels = labels.filter(l => l.parent_id === numericLabelId);

      // Konfirmasi penghapusan jika ada sublabel
      if (sublabels.length > 0) {
        const isConfirmed = window.confirm(
          `Label "${labelToDelete.label}" memiliki ${sublabels.length} sublabel yang juga akan dihapus. Lanjutkan?`
        );

        if (!isConfirmed) return;
      }

      // Hapus label dari server
      await deleteLabel(numericLabelId);

      // Simpan label yang dihapus untuk undo
      const deletedLabel = {
        ...labelToDelete,
        sublabels: sublabels
      };

      // Hapus timer undo sebelumnya jika ada
      if (undoState.timer) {
        clearTimeout(undoState.timer);
      }

      // Set timer baru untuk undo
      const timer = setTimeout(() => {
        setUndoState({ show: false, label: null, timer: null });
      }, 5000);

      // Update undo state
      setUndoState({
        show: true,
        label: deletedLabel,
        timer
      });

      // Update state
      setLabels(prev => prev.filter(l =>
        l.id !== numericLabelId && l.parent_id !== numericLabelId
      ));

      // Update selected labels
      const idsToRemove = [numericLabelId, ...sublabels.map(s => s.id)];
      handleLabelToggle(selectedLabels.filter(id => !idsToRemove.includes(id)));

      // Tampilkan notifikasi
      toast.success(`${labelToDelete.is_sublabel ? 'Sublabel' : 'Label'} berhasil dihapus`);
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error('Gagal menghapus label');
    }
  }, [labels, selectedLabels, handleLabelToggle, undoState.timer]);

  /**
   * Fungsi untuk membatalkan penghapusan label (undo)
   */
  const handleUndo = useCallback(async () => {
    if (!undoState.label) return;

    try {
      const { label: deletedLabel, sublabels } = undoState.label;

      // Buat ulang label utama
      const newLabel = await createLabel({
        label: deletedLabel.label,
        parent_id: deletedLabel.parent_id
      });

      // Format label untuk konsistensi
      const formattedLabel = {
        id: parseInt(newLabel.id),
        label: newLabel.label || deletedLabel.label,
        name: newLabel.label || newLabel.name || deletedLabel.label,
        parent_id: deletedLabel.parent_id,
        is_sublabel: !!deletedLabel.parent_id
      };

      // Update state
      setLabels(prev => [...prev, formattedLabel]);

      // Tambahkan ke selected labels
      handleLabelToggle([...selectedLabels, formattedLabel.id]);

      // Buat ulang sublabel jika ada
      if (sublabels && sublabels.length > 0) {
        for (const sublabel of sublabels) {
          const newSublabel = await createLabel({
            label: sublabel.label,
            parent_id: formattedLabel.id
          });

          // Format sublabel untuk konsistensi
          const formattedSublabel = {
            id: parseInt(newSublabel.id),
            label: newSublabel.label || sublabel.label,
            name: newSublabel.label || newSublabel.name || sublabel.label,
            parent_id: formattedLabel.id,
            is_sublabel: true,
            parent_label: formattedLabel.label
          };

          // Update state
          setLabels(prev => [...prev, formattedSublabel]);

          // Tambahkan ke selected labels
          handleLabelToggle([...selectedLabels, formattedSublabel.id]);
        }
      }

      // Reset undo state
      setUndoState({ show: false, label: null, timer: null });

      // Tampilkan notifikasi
      toast.success(`Label berhasil dipulihkan`);
    } catch (error) {
      console.error('Error restoring label:', error);
      toast.error('Gagal memulihkan label');
    }
  }, [undoState.label, selectedLabels, handleLabelToggle]);

  // Load labels saat komponen mount
  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  // Update selectedLabels ketika initialSelectedLabels berubah
  useEffect(() => {
    // Pastikan initialSelectedLabels adalah array of numbers
    const normalizedLabels = Array.isArray(initialSelectedLabels)
      ? initialSelectedLabels.map(id => typeof id === 'string' ? parseInt(id) : id)
      : [];

    if (normalizedLabels.length > 0) {
      setSelectedLabels(normalizedLabels);
    }
  }, [initialSelectedLabels]);

  // Cleanup timer saat komponen unmount
  useEffect(() => {
    return () => {
      if (undoState.timer) {
        clearTimeout(undoState.timer);
      }
    };
  }, [undoState.timer]);

  return {
    labels,
    selectedLabels,
    isLoading,
    showUndo: undoState.show,
    handleLabelToggle,
    handleLabelCreate,
    handleLabelEdit,
    handleLabelDelete,
    handleUndo,
    setLabels
  };
};
