import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaChevronDown, FaChevronUp, FaPlus, FaArrowLeft, FaTag, FaTags } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import LabelManager from './LabelManager';
import LabelDropdown from './LabelDropdown';
import './PostLabels.css';

/**
 * Komponen untuk mengelola label post
 * @param {Object} props - Props komponen
 */
const PostLabels = ({
  labels = [],
  selectedLabels = [],
  onLabelToggle,
  onLabelCreate,
  onLabelEdit,
  onLabelDelete,
  showUndo = false,
  onUndo
}) => {
  // Mendapatkan informasi user dari AuthContext
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State untuk dropdown dan label manager
  const [isOpen, setIsOpen] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);

  // Mendapatkan label yang dipilih
  const selectedLabelObjects = useMemo(() => {
    return labels.filter(label => selectedLabels.includes(label.id));
  }, [labels, selectedLabels]);

  // Mendapatkan teks untuk label yang dipilih
  const selectedLabelsText = useMemo(() => {
    if (selectedLabelObjects.length === 0) return '';
    if (selectedLabelObjects.length === 1) return selectedLabelObjects[0].label;
    return `${selectedLabelObjects.length} Label`;
  }, [selectedLabelObjects]);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowLabelManager(false);
      setEditingLabel(null);
    }
  };

  // Handler untuk menambah sublabel
  const handleAddSublabel = (parentId) => {
    if (isAdmin) {
      setEditingLabel({
        parent_id: parentId,
        isSubLabel: true
      });
      setShowLabelManager(true);
    }
  };

  // Handler untuk edit label
  const handleEditLabel = (label) => {
    if (isAdmin) {
      setEditingLabel({
        ...label,
        isSubLabel: !!label.parent_id
      });
      setShowLabelManager(true);
    }
  };

  // Handler untuk submit label manager
  const handleLabelManagerSubmit = (name) => {
    try {
      console.log('handleLabelManagerSubmit dipanggil dengan nama:', name);

      if (editingLabel && editingLabel.id) {
        // Edit label
        console.log('Mengedit label dengan ID:', editingLabel.id);
        onLabelEdit(editingLabel.id, name);
      } else {
        // Create label
        const parentId = editingLabel?.parent_id || null;
        console.log('Membuat label baru dengan parentId:', parentId);
        onLabelCreate(name, parentId);
      }

      // Reset state
      setTimeout(() => {
        setShowLabelManager(false);
        setEditingLabel(null);
      }, 100);

      // Mencegah navigasi halaman
      return false;
    } catch (error) {
      console.error('Error in handleLabelManagerSubmit:', error);
      // Tetap reset state meskipun terjadi error
      setTimeout(() => {
        setShowLabelManager(false);
        setEditingLabel(null);
      }, 100);
      return false;
    }
  };

  return (
    <div className="post-labels-container">
      <label className="post-labels-label">Label Post</label>

      <div className="post-labels-wrapper">
        <button
          type="button"
          className="post-labels-toggle"
          onClick={toggleDropdown}
          aria-expanded={isOpen}
        >
          <span className="post-labels-toggle-text">
            {selectedLabelsText || <span className="post-labels-toggle-placeholder">Pilih Label</span>}
          </span>
          {isOpen ? <FaChevronUp className="post-labels-toggle-icon" /> : <FaChevronDown className="post-labels-toggle-icon" />}
        </button>

        {isOpen && (
          <div className="post-labels-dropdown">
            <div className={`post-labels-content ${isOpen ? 'open' : ''}`} style={{ width: '100%' }}>
              {showLabelManager ? (
                <LabelManager
                  labels={labels}
                  onSubmit={handleLabelManagerSubmit}
                  initialValue={editingLabel}
                  submitLabel={editingLabel && editingLabel.id ? 'Simpan' : 'Tambah'}
                  onCancel={() => {
                    setShowLabelManager(false);
                    setEditingLabel(null);
                  }}
                  isEditMode={!!(editingLabel && editingLabel.id)}
                  isSubLabel={!!(editingLabel && editingLabel.isSubLabel)}
                />
              ) : (
                <LabelDropdown
                  labels={labels}
                  selectedLabels={selectedLabels}
                  onLabelToggle={onLabelToggle}
                  onAddSublabel={handleAddSublabel}
                  onEditLabel={handleEditLabel}
                  onDeleteLabel={onLabelDelete}
                  isAdmin={isAdmin}
                />
              )}

              {isAdmin && (
                <div className="post-labels-actions">
                  {showLabelManager ? (
                    <button
                      type="button"
                      className="post-labels-back-btn"
                      onClick={() => {
                        setShowLabelManager(false);
                        setEditingLabel(null);
                      }}
                    >
                      <FaArrowLeft className="post-labels-back-btn-icon" />
                      Kembali ke Label
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="post-labels-add-btn"
                      onClick={() => {
                        setShowLabelManager(true);
                        setEditingLabel(null);
                      }}
                    >
                      <FaPlus className="post-labels-add-btn-icon" />
                      Tambah Label Baru
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedLabelObjects.length > 0 && (
        <div className="post-labels-selected">
          {selectedLabelObjects.map(label => (
            <span key={label.id} className="post-labels-badge">
              {label.parent_id ? (
                <FaTag className="post-labels-badge-icon" />
              ) : (
                <FaTags className="post-labels-badge-icon" />
              )}
              {label.label}
            </span>
          ))}
        </div>
      )}

      {showUndo && (
        <div className="post-labels-undo">
          <span className="post-labels-undo-text">Label telah dihapus</span>
          <button
            type="button"
            className="post-labels-undo-btn"
            onClick={onUndo}
          >
            Batalkan
          </button>
        </div>
      )}
    </div>
  );
};

PostLabels.propTypes = {
  labels: PropTypes.array,
  selectedLabels: PropTypes.array,
  onLabelToggle: PropTypes.func.isRequired,
  onLabelCreate: PropTypes.func.isRequired,
  onLabelEdit: PropTypes.func.isRequired,
  onLabelDelete: PropTypes.func.isRequired,
  showUndo: PropTypes.bool,
  onUndo: PropTypes.func
};

export default PostLabels;