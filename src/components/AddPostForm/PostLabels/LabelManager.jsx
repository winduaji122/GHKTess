import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './LabelManager.css';

/**
 * Komponen untuk mengelola label (tambah/edit)
 * @param {Object} props - Props komponen
 */
const LabelManager = ({
  labels = [],
  onSubmit,
  initialValue = '',
  submitLabel = 'Tambah',
  onCancel,
  isEditMode = false,
  isSubLabel = false
}) => {
  // State untuk nama label
  const [labelName, setLabelName] = useState('');

  // State untuk error
  const [error, setError] = useState('');

  // Inisialisasi state dari initialValue
  useEffect(() => {
    if (initialValue) {
      if (typeof initialValue === 'string') {
        setLabelName(initialValue);
      } else if (typeof initialValue === 'object') {
        setLabelName(initialValue.name || initialValue.label || '');
      }
    }
  }, [initialValue]);

  /**
   * Handler untuk submit form
   * @param {Event} e - Event objek
   */
  const handleSubmit = (e) => {
    if (e) e.preventDefault(); // Mencegah form melakukan submit default

    // Validasi input
    if (!labelName.trim()) {
      setError('Nama label tidak boleh kosong');
      return false;
    }

    // Cek apakah label sudah ada (untuk mencegah duplikasi)
    const labelExists = labels.some(
      label =>
        (label.label || label.name || '').toLowerCase() === labelName.trim().toLowerCase() &&
        // Jika ini adalah sublabel, cek juga parent_id
        (isSubLabel ? label.parent_id === (initialValue?.parent_id || null) : !label.parent_id)
    );

    if (labelExists && !isEditMode) {
      setError('Label dengan nama yang sama sudah ada');
      return false;
    }

    // Reset error
    setError('');

    try {
      console.log('Memanggil onSubmit dengan nama label:', labelName.trim());
      // Panggil callback
      onSubmit(labelName.trim());

      // Reset form jika bukan mode edit
      if (!isEditMode) {
        setLabelName('');
      }

      return true;
    } catch (error) {
      console.error('Error saat memanggil onSubmit:', error);
      setError('Terjadi kesalahan saat menyimpan label');
      return false;
    }
  };

  return (
    <div className="label-manager">
      <div className="label-manager-header">
        <h3 className="label-manager-title">
          {isEditMode
            ? 'Edit Label'
            : isSubLabel
              ? 'Tambah Sublabel'
              : 'Tambah Label Baru'}
        </h3>
      </div>

      <div className="label-manager-form">
        <div className="label-manager-input-group">
          <input
            type="text"
            className={`label-manager-input ${error ? 'error' : ''}`}
            placeholder={isSubLabel ? "Nama Sublabel" : "Nama Label"}
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              // Mencegah form submit saat menekan Enter
              if (e.key === 'Enter') {
                e.preventDefault();
                if (labelName.trim()) {
                  handleSubmit(e);
                }
              }
            }}
          />
          {error && <div className="label-manager-error">{error}</div>}
        </div>

        <div className="label-manager-actions">
          {onCancel && (
            <button
              type="button"
              className="label-manager-cancel-btn"
              onClick={onCancel}
            >
              Batal
            </button>
          )}
          <button
            type="button"
            className="label-manager-submit-btn"
            disabled={!labelName.trim()}
            onClick={(e) => {
              e.preventDefault();
              if (labelName.trim()) {
                handleSubmit(e);
              }
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

LabelManager.propTypes = {
  labels: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  submitLabel: PropTypes.string,
  onCancel: PropTypes.func,
  isEditMode: PropTypes.bool,
  isSubLabel: PropTypes.bool
};

export default LabelManager;
