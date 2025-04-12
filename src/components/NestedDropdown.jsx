import React, { useState, useRef, useEffect } from 'react';
import './NestedDropdown.css';

const NestedDropdown = ({ labels = [], onFilterChange, currentFilters, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const dropdownRef = useRef(null);


  // Perbaiki sortOptions dengan nilai default yang benar
  const sortOptions = [
    { value: 'created_at:desc', label: 'Terbaru' },
    { value: 'created_at:asc', label: 'Terlama' },
    { value: 'views:desc', label: 'Paling Banyak Dilihat' },
    { value: 'title:asc', label: 'Judul (A-Z)' },
    { value: 'title:desc', label: 'Judul (Z-A)' },
    { value: 'is_featured:desc', label: 'Featured' },
    { value: 'label:asc', label: 'Label (A-Z)' }, 
    { value: 'label:desc', label: 'Label (Z-A)' }
  ];

  // Fungsi untuk mengecek apakah ada filter aktif
  const hasActiveFilters = () => {
    return !!(
      currentFilters?.status !== 'all' || 
      currentFilters?.label || 
      currentFilters?.featured || 
      currentFilters?.sort
    );
  };

  // Modifikasi fungsi getActiveFilterLabel
  const getActiveFilterLabel = () => {
    if (isLoading) return 'Loading...';
    
    if (!currentFilters) return 'Filter & Sort';
    
    // Hanya tampilkan satu label aktif (yang paling prioritas)
    if (currentFilters.status && currentFilters.status !== 'all') {
      return `Status: ${currentFilters.status}`;
    }
    
    if (currentFilters.label) {
      const activeLabel = labels.find(l => l.id === currentFilters.label);
      if (activeLabel) return `Label: ${activeLabel.label}`;
    }

    if (currentFilters.featured) {
      return `Featured: ${currentFilters.featured}`;
    }

    if (currentFilters.sort) {
      const activeSort = sortOptions.find(s => s.value === currentFilters.sort);
      if (activeSort) return `Sort: ${activeSort.label}`;
    }

    return 'Filter & Sort';
  };

  // Perbaiki handleFilterSelect
  const handleFilterSelect = (type, value) => {
    if (!onFilterChange) return;
    
    console.log('Selecting filter:', type, value);
    onFilterChange(type, value);
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const renderLabelSubmenu = () => (
    <div className="submenu">
      <div 
        className={!currentFilters.label ? 'active' : ''}
        onClick={() => handleFilterSelect('label', '')}
      >
        Semua Label
      </div>
      {labels.map(label => (
        <div 
          key={label.id}
          className={currentFilters.label === label.id ? 'active' : ''}
          onClick={() => handleFilterSelect('label', label.id)}
        >
          {label.label}
        </div>
      ))}
    </div>
  );

  // Perbaiki render sort submenu
  const renderSortSubmenu = () => (
    <div className="submenu">
      {sortOptions.map(option => (
        <div 
          key={option.value}
          className={currentFilters.sort === option.value ? 'active' : ''}
          onClick={() => handleFilterSelect('sort', option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );

  return (
    <div className="nested-dropdown" ref={dropdownRef}>
      <button 
        className={`dropdown-toggle ${hasActiveFilters() ? 'has-filters' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="dropdown-label">{getActiveFilterLabel()}</span>
        {hasActiveFilters() && (
          <span className="filter-indicator">•</span>
        )}
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {/* Status Filter */}
          <div 
            className="dropdown-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('status')}
          >
            <span>Status Post</span>
            {activeSubmenu === 'status' && (
              <div className="submenu">
                <div 
                  className={currentFilters.status === 'all' ? 'active' : ''}
                  onClick={() => handleFilterSelect('status', 'all')}
                >
                  Semua Status
                </div>
                <div 
                  className={currentFilters.status === 'published' ? 'active' : ''}
                  onClick={() => handleFilterSelect('status', 'published')}
                >
                  Published
                </div>
                <div 
                  className={currentFilters.status === 'draft' ? 'active' : ''}
                  onClick={() => handleFilterSelect('status', 'draft')}
                >
                  Draft
                </div>
                <div 
                  className={currentFilters.status === 'archived' ? 'active' : ''}
                  onClick={() => handleFilterSelect('status', 'archived')}
                >
                  Archived
                </div>
              </div>
            )}
          </div>

          {/* Label Filter dengan penanganan yang lebih baik */}
          <div 
            className="dropdown-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('label')}
          >
            <span>Label</span>
            {activeSubmenu === 'label' && renderLabelSubmenu()}
          </div>

          {/* Sort Filter */}
          <div 
            className="dropdown-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('sort')}
          >
            <span>Urutkan</span>
            {activeSubmenu === 'sort' && renderSortSubmenu()}
          </div>

          {/* Featured Status */}
          <div 
            className="dropdown-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('featured')}
          >
            <span>Status Featured</span>
            {activeSubmenu === 'featured' && (
              <div className="submenu">
                <div 
                  className={!currentFilters.featured ? 'active' : ''}
                  onClick={() => handleFilterSelect('featured', '')}
                >
                  Semua Post
                </div>
                <div 
                  className={currentFilters.featured === 'featured' ? 'active' : ''}
                  onClick={() => handleFilterSelect('featured', 'featured')}
                >
                  Featured
                </div>
                <div 
                  className={currentFilters.featured === 'spotlight' ? 'active' : ''}
                  onClick={() => handleFilterSelect('featured', 'spotlight')}
                >
                  Spotlight
                </div>
                <div 
                  className={currentFilters.featured === 'regular' ? 'active' : ''}
                  onClick={() => handleFilterSelect('featured', 'regular')}
                >
                  Regular
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NestedDropdown;
