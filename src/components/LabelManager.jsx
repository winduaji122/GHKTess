import React, { useState, useEffect } from 'react';
import { getLabels, createLabel, deleteLabel, updateLabel } from '../api/labelApi';

const LabelManager = ({ onLabelAdded, onLabelDeleted, onLabelUpdated }) => {
  const [newLabel, setNewLabel] = useState('');
  const [labels, setLabels] = useState([]);
  const [error, setError] = useState('');
  const [editingLabel, setEditingLabel] = useState(null);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const fetchedLabels = await getLabels();
      setLabels(fetchedLabels);
    } catch (error) {
      console.error('Error mengambil label:', error);
      setError('Gagal mengambil label. Silakan coba lagi nanti.');
    }
  };

  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    try {
      const createdLabel = await createLabel(newLabel);
      setLabels([...labels, createdLabel]);
      onLabelAdded(createdLabel);
      setNewLabel('');
      setError('');
    } catch (error) {
      console.error('Error menambahkan label:', error);
      setError('Gagal menambahkan label. Silakan coba lagi.');
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await deleteLabel(labelId);
      setLabels(labels.filter(label => label.id !== labelId));
      onLabelDeleted(labelId);
      setError('');
    } catch (error) {
      console.error('Error menghapus label:', error);
      setError('Gagal menghapus label. Silakan coba lagi.');
    }
  };

  const handleEditLabel = (label) => {
    setEditingLabel(label);
    setNewLabel(label.label);
  };

  const handleUpdateLabel = async (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !editingLabel) return;

    try {
      const updatedLabel = await updateLabel(editingLabel.id, newLabel);
      setLabels(labels.map(label => 
        label.id === updatedLabel.id ? updatedLabel : label
      ));
      onLabelUpdated(updatedLabel);
      setNewLabel('');
      setEditingLabel(null);
      setError('');
    } catch (error) {
      console.error('Error memperbarui label:', error);
      setError('Gagal memperbarui label. Silakan coba lagi.');
    }
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setNewLabel('');
  };

  return (
    <div className="label-manager">
      <h3>Kelola Label</h3>
      <form onSubmit={editingLabel ? handleUpdateLabel : handleAddLabel}>
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={editingLabel ? "Edit nama label" : "Masukkan nama label baru"}
        />
        <button type="submit">
          {editingLabel ? 'Perbarui Label' : 'Tambah Label'}
        </button>
        {editingLabel && (
          <button type="button" onClick={handleCancelEdit}>Batal</button>
        )}
      </form>
      {error && <p className="error-message">{error}</p>}
      <ul className="label-list">
        {labels.map(label => (
          <li key={label.id} className="label-item">
            {label.label}
            <button onClick={() => handleEditLabel(label)} className="edit-label">
              Edit
            </button>
            <button onClick={() => handleDeleteLabel(label.id)} className="delete-label">
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LabelManager;
