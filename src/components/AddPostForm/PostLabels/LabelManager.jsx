import React, { useState, useEffect } from 'react';

const LabelManager = ({ 
  onLabelCreate, 
  initialValue = '', 
  submitLabel = 'Tambah',
  onCancel
}) => {
  const [labelName, setLabelName] = useState(initialValue);

  useEffect(() => {
    setLabelName(initialValue);
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (labelName.trim()) {
      onLabelCreate(labelName.trim());
      setLabelName('');
    }
  };

  return (
    <div className="label-manager">
      <div className="input-group">
        <input
          type="text"
          value={labelName}
          onChange={(e) => setLabelName(e.target.value)}
          placeholder="Nama label..."
          className="label-input"
        />
        <button 
          type="button" 
          onClick={handleSubmit}
          className="submit-button"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="cancel-button"
          >
            Batal
          </button>
        )}
      </div>
    </div>
  );
};

export default LabelManager;