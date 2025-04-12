import React, { useState } from 'react';
import LabelManager from './LabelManager';

const PostLabels = ({ 
  labels, 
  selectedLabels, 
  onLabelToggle, 
  onLabelCreate, 
  onLabelDelete,
  onLabelEdit,
  showUndo,
  onUndo 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  
  const activeLabels = labels.filter(label => selectedLabels.includes(label.id));
  const activeLabelsCount = activeLabels.length;

  const handleEditClick = (label) => {
    setEditingLabel(label);
  };

  const handleEditSubmit = (labelId, newName) => {
    onLabelEdit(labelId, newName);
    setEditingLabel(null);
  };

  const handleLabelToggle = (labelId) => {
    const newSelectedLabels = selectedLabels.includes(labelId)
      ? selectedLabels.filter(id => id !== labelId)
      : [...selectedLabels, labelId];
    onLabelToggle(newSelectedLabels);
  };

  return (
    <div className="label-management">
      <label htmlFor="post-status" className="status-label">Label Post</label>
      
      <button 
        type="button"
        className="label-dropdown-toggle"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {activeLabelsCount > 0 
          ? `${activeLabelsCount} Label dipilih: ${activeLabels.map(l => l.name).join(', ')}` 
          : 'Pilih Label'}
      </button>

      {isDropdownOpen && (
        <div className="label-dropdown-menu">
          <div className="label-list">
            {labels.map(label => (
              <div key={label.id} className="label-item">
                <div className="label-checkbox">
                  <input
                    type="checkbox"
                    id={`label-${label.id}`}
                    checked={selectedLabels.includes(label.id)}
                    onChange={() => handleLabelToggle(label.id)}
                  />
                  <label htmlFor={`label-${label.id}`}>
                    {label.name}
                  </label>
                </div>
                <div className="label-actions">
                  <button
                    type="button"
                    className="edit-label-btn"
                    onClick={() => handleEditClick(label)}
                  >
                    <span className="edit-icon">✎</span>
                  </button>
                  <button
                    type="button"
                    className="delete-label-btn"
                    onClick={() => onLabelDelete(label.id)}
                  >
                    <span className="delete-icon">×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="add-label-form">
            {editingLabel ? (
              <LabelManager 
                onLabelCreate={(newName) => handleEditSubmit(editingLabel.id, newName)}
                initialValue={editingLabel.name}
                submitLabel="Simpan"
                onCancel={() => setEditingLabel(null)}
              />
            ) : (
              <LabelManager 
                onLabelCreate={onLabelCreate}
                submitLabel="Tambah"
              />
            )}
          </div>
        </div>
      )}

      {showUndo && (
        <div className="undo-notification">
          Label telah dihapus. 
          <button onClick={onUndo}>Undo</button>
        </div>
      )}
    </div>
  );
};

export default PostLabels;