import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './SearchBar.css';
import { debounce } from 'lodash';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { FiList, FiGrid, FiColumns, FiLayout } from 'react-icons/fi';

const SearchBar = ({
  searchTerm,
  selectedLabel,
  labels,
  onSearch,
  viewMode,
  onViewModeChange,
  newPostButton,
  isAdmin = false // Tambahkan prop isAdmin dengan default false
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const [localLabel, setLocalLabel] = useState(selectedLabel || '');
  const [labelOptions, setLabelOptions] = useState(labels || []);
  const [isLoading, setIsLoading] = useState(true);
  const labelsCache = useRef(new Map());

  // Tidak menggunakan debounced search lagi karena pencarian dilakukan saat tombol Cari diklik

  const debouncedFetchLabels = useCallback(
    debounce(async () => {
      try {
        setIsLoading(true);

        if (labelsCache.current.has('labels')) {
          setLabelOptions(labelsCache.current.get('labels'));
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/search/labels`);

        if (Array.isArray(response.data)) {
          const fetchedLabels = response.data.map(label => ({
            id: label.id,
            name: label.name || label.label
          }));

          labelsCache.current.set('labels', fetchedLabels);
          setLabelOptions(fetchedLabels);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          const fetchedLabels = response.data.data.map(label => ({
            id: label.id,
            name: label.name || label.label
          }));

          labelsCache.current.set('labels', fetchedLabels);
          setLabelOptions(fetchedLabels);
        }

        console.log('Fetched labels:', labelOptions);

      } catch (error) {
        console.error('Error fetching labels:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedFetchLabels();
    return () => debouncedFetchLabels.cancel();
  }, [debouncedFetchLabels]);

  // Fungsi untuk memastikan filter "Semua Kategori" menampilkan semua post
  const handleSubmit = (e) => {
    e.preventDefault();
    // Jika label adalah string kosong, pastikan kita mengirim string kosong
    // untuk menampilkan semua post
    onSearch(localSearchTerm, localLabel === '' ? '' : localLabel);
  };

  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    setLocalLabel(newLabel);
    // Tidak melakukan pencarian otomatis saat memilih label
    // Pencarian akan dilakukan saat tombol Cari diklik
  };

  // Tentukan class berdasarkan isAdmin
  const searchBarClass = isAdmin ? "admin-search-bar" : "writer-search-bar";
  const searchInputContainerClass = isAdmin ? "admin-search-input-container" : "writer-search-input-container";
  const searchIconClass = isAdmin ? "admin-search-icon" : "writer-search-icon";
  const searchInputClass = isAdmin ? "admin-search-input" : "writer-search-input";
  const searchClearClass = isAdmin ? "admin-search-clear" : "writer-search-clear";
  const searchFiltersClass = isAdmin ? "admin-search-filters" : "writer-search-filters";
  const filterSelectClass = isAdmin ? "admin-filter-select" : "writer-filter-select";
  const searchButtonClass = isAdmin ? "admin-search-button" : "writer-search-button";

  return (
    <form onSubmit={handleSubmit} className={searchBarClass}>
      <div className={searchInputContainerClass}>
        <input
          type="text"
          value={localSearchTerm}
          onChange={(e) => {
            setLocalSearchTerm(e.target.value);
            // Tidak melakukan pencarian otomatis saat mengetik
            if (e.target.value === '') {
              onSearch('', localLabel);
            }
            // Pencarian akan dilakukan saat tombol Cari diklik
          }}
          placeholder={isAdmin ? "Cari postingan..." : "Cari artikel..."}
          className={searchInputClass}
        />
        {localSearchTerm ? (
          <button
            type="button"
            className={searchClearClass}
            onClick={() => {
              setLocalSearchTerm('');
              onSearch('', localLabel);
            }}
          >
            <FaTimes />
          </button>
        ) : (
          <FaSearch className={searchIconClass} size={12} />
        )}
      </div>

      <div className={searchFiltersClass}>
        <select
          value={localLabel}
          onChange={handleLabelChange}
          className={filterSelectClass}
          disabled={isLoading}
        >
          <option value="">Semua Kategori</option>
          {isLoading ? (
            <option value="" disabled>Loading kategori...</option>
          ) : (
            labelOptions?.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))
          )}
        </select>
      </div>

      <button type="submit" className={searchButtonClass}>Cari</button>

      <div className={isAdmin ? "admin-search-bar-controls" : "search-bar-controls"}>
        {/* View Mode Controls */}
        {viewMode && onViewModeChange && (
          <div className={isAdmin ? "admin-view-mode-controls" : "view-mode-controls"}>
            <button
              className={`${isAdmin ? 'admin-view-mode-button' : 'view-mode-button'} ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="Tampilan List"
              type="button"
            >
              <FiList />
            </button>
            <button
              className={`${isAdmin ? 'admin-view-mode-button' : 'view-mode-button'} ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Tampilan Grid"
              type="button"
            >
              <FiGrid />
            </button>
            <button
              className={`${isAdmin ? 'admin-view-mode-button' : 'view-mode-button'} ${viewMode === 'column' ? 'active' : ''}`}
              onClick={() => onViewModeChange('column')}
              title="Tampilan Kolom"
              type="button"
            >
              <FiColumns />
            </button>
            <button
              className={`${isAdmin ? 'admin-view-mode-button' : 'view-mode-button'} ${viewMode === 'flexbox' ? 'active' : ''}`}
              onClick={() => onViewModeChange('flexbox')}
              title="Tampilan Flexbox"
              type="button"
            >
              <FiLayout />
            </button>
          </div>
        )}

        {/* New Post Button */}
        {newPostButton && (
          <div className={isAdmin ? "admin-new-post-button-container" : "new-post-button-container"}>
            {newPostButton}
          </div>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
