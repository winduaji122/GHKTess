import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FaTag,
  FaTags,
  FaPlus,
  FaPen,
  FaTrash,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import './LabelDropdown.css';

/**
 * Komponen untuk menampilkan dropdown label dan sublabel
 * @param {Object} props - Props komponen
 */
const LabelDropdown = ({
  labels = [],
  selectedLabels = [],
  onLabelToggle,
  onAddSublabel,
  onEditLabel,
  onDeleteLabel,
  isAdmin = false
}) => {
  // State untuk menyimpan label yang di-expand
  const [expandedLabels, setExpandedLabels] = useState({});

  // Event listener untuk menangani event sublabel-added
  useEffect(() => {
    const handleSublabelAdded = (event) => {
      const { parentId } = event.detail;
      // Auto-expand parent label ketika sublabel baru ditambahkan
      setExpandedLabels(prev => ({
        ...prev,
        [parentId]: true
      }));
    };

    // Tambahkan event listener
    window.addEventListener('sublabel-added', handleSublabelAdded);

    // Cleanup event listener
    return () => {
      window.removeEventListener('sublabel-added', handleSublabelAdded);
    };
  }, []);

  // Memisahkan label utama dan sublabel
  const { mainLabels, subLabels } = useMemo(() => {
    const main = labels.filter(label => !label.parent_id && !label.is_sublabel);
    const sub = labels.filter(label => label.parent_id || label.is_sublabel);
    return { mainLabels: main, subLabels: sub };
  }, [labels]);

  // Mengelompokkan sublabel berdasarkan parent_id
  const subLabelsByParent = useMemo(() => {
    const grouped = {};

    subLabels.forEach(sublabel => {
      const parentId = parseInt(sublabel.parent_id);

      if (!grouped[parentId]) {
        grouped[parentId] = [];
      }

      grouped[parentId].push(sublabel);
    });

    return grouped;
  }, [subLabels]);

  // Auto-expand labels yang memiliki sublabel yang dipilih
  useEffect(() => {
    if (selectedLabels.length > 0 && subLabels.length > 0) {
      console.log('Checking for selected sublabels to auto-expand parents');

      // Cari sublabel yang dipilih
      const selectedSublabelIds = selectedLabels.map(id =>
        typeof id === 'string' ? parseInt(id) : id
      );

      // Cari parent_id dari sublabel yang dipilih
      const parentIdsToExpand = subLabels
        .filter(sublabel => selectedSublabelIds.includes(parseInt(sublabel.id)))
        .map(sublabel => parseInt(sublabel.parent_id));

      if (parentIdsToExpand.length > 0) {
        console.log('Parents to auto-expand:', parentIdsToExpand);

        // Set expanded state untuk parent labels
        const newExpandedState = {};
        parentIdsToExpand.forEach(parentId => {
          if (parentId) newExpandedState[parentId] = true;
        });

        setExpandedLabels(prev => ({
          ...prev,
          ...newExpandedState
        }));
      }
    }
  }, [selectedLabels, subLabels]);

  // Handler untuk toggle label
  const handleLabelChange = (labelId) => {
    const id = parseInt(labelId);

    // Debug log
    console.log('Toggle label:', id);
    console.log('Current selectedLabels:', selectedLabels);
    console.log('Is selected?', selectedLabels.includes(id));

    // Pastikan selectedLabels adalah array of numbers
    const normalizedSelectedLabels = selectedLabels.map(selectedId =>
      typeof selectedId === 'string' ? parseInt(selectedId) : selectedId
    );

    const newSelectedLabels = normalizedSelectedLabels.includes(id)
      ? normalizedSelectedLabels.filter(selectedId => selectedId !== id)
      : [...normalizedSelectedLabels, id];

    console.log('New selectedLabels:', newSelectedLabels);

    onLabelToggle(newSelectedLabels);
  };

  // Handler untuk toggle expand/collapse sublabel
  const toggleExpand = (labelId) => {
    const id = parseInt(labelId);
    setExpandedLabels(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handler untuk menambah sublabel
  const handleAddSublabel = (parentId) => {
    if (isAdmin && onAddSublabel) {
      onAddSublabel(parseInt(parentId));
    }
  };

  // Handler untuk edit label
  const handleEditLabel = (label) => {
    if (isAdmin && onEditLabel) {
      onEditLabel(label);
    }
  };

  // Handler untuk delete label
  const handleDeleteLabel = (labelId) => {
    if (isAdmin && onDeleteLabel) {
      onDeleteLabel(parseInt(labelId));
    }
  };

  // Render empty state jika tidak ada label
  if (labels.length === 0) {
    return (
      <div className="label-dropdown">
        <div className="empty-message">
          Tidak ada label tersedia
        </div>
      </div>
    );
  }

  return (
    <div className="label-dropdown">
      <div className="label-list">
        {mainLabels.map(mainLabel => {
          const mainLabelId = parseInt(mainLabel.id);
          const hasSubLabels = subLabelsByParent[mainLabelId]?.length > 0;
          const isExpanded = expandedLabels[mainLabelId];

          return (
            <div key={`main-${mainLabelId}`} className="label-group">
              <div className="main-label">
                <div className="label-checkbox">
                  <input
                    type="checkbox"
                    id={`label-${mainLabelId}`}
                    checked={selectedLabels.some(id =>
                      (typeof id === 'string' ? parseInt(id) : id) === mainLabelId
                    )}
                    onChange={() => handleLabelChange(mainLabelId)}
                  />
                  <label htmlFor={`label-${mainLabelId}`}>
                    <FaTags className="label-icon" />
                    {mainLabel.name || mainLabel.label}
                  </label>
                </div>

                <div className="label-actions">
                  {hasSubLabels && (
                    <button
                      type="button"
                      className="label-action-btn toggle-btn"
                      onClick={() => toggleExpand(mainLabelId)}
                      title={isExpanded ? "Sembunyikan sublabel" : "Tampilkan sublabel"}
                    >
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="label-action-btn add-btn"
                        onClick={() => handleAddSublabel(mainLabelId)}
                        title="Tambah sublabel"
                      >
                        <FaPlus />
                      </button>

                      <button
                        type="button"
                        className="label-action-btn edit-btn"
                        onClick={() => handleEditLabel(mainLabel)}
                        title="Edit label"
                      >
                        <FaPen />
                      </button>

                      <button
                        type="button"
                        className="label-action-btn delete-btn"
                        onClick={() => handleDeleteLabel(mainLabelId)}
                        title="Hapus label"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {hasSubLabels && isExpanded && (
                <div className="sublabel-list">
                  {subLabelsByParent[mainLabelId].map(sublabel => {
                    const sublabelId = parseInt(sublabel.id);
                    const isNewSublabel = sublabel.isNew || false;

                    return (
                      <div
                        key={`sub-${sublabelId}`}
                        className={`sublabel ${isNewSublabel ? 'sublabel-new' : ''}`}
                      >
                        <div className="label-checkbox">
                          <input
                            type="checkbox"
                            id={`label-${sublabelId}`}
                            checked={selectedLabels.some(id =>
                              (typeof id === 'string' ? parseInt(id) : id) === sublabelId
                            )}
                            onChange={() => handleLabelChange(sublabelId)}
                          />
                          <label htmlFor={`label-${sublabelId}`}>
                            <FaTag className="sublabel-icon" />
                            {sublabel.name || sublabel.label}
                          </label>
                        </div>

                        {isAdmin && (
                          <div className="label-actions">
                            <button
                              type="button"
                              className="label-action-btn edit-btn"
                              onClick={() => handleEditLabel(sublabel)}
                              title="Edit sublabel"
                            >
                              <FaPen />
                            </button>

                            <button
                              type="button"
                              className="label-action-btn delete-btn"
                              onClick={() => handleDeleteLabel(sublabelId)}
                              title="Hapus sublabel"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

LabelDropdown.propTypes = {
  labels: PropTypes.array,
  selectedLabels: PropTypes.array,
  onLabelToggle: PropTypes.func.isRequired,
  onAddSublabel: PropTypes.func,
  onEditLabel: PropTypes.func,
  onDeleteLabel: PropTypes.func,
  isAdmin: PropTypes.bool
};

export default LabelDropdown;
