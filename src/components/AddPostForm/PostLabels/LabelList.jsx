import React from 'react';

const LabelList = ({ labels, onLabelDelete }) => {
  if (labels.length === 0) return null;

  return (
    <div className="selected-labels">
      {labels.map(label => (
        <div key={label.id} className="label-item">
          <span>{label.name}</span>
          <div className="label-actions">
            <button
              type="button"
              onClick={() => onLabelDelete(label.id)}
              className="delete-label-btn"
              title="Hapus label"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LabelList;