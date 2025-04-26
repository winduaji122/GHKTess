import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './LabelSearchBar.css';
import { debounce } from 'lodash';
import { FaSearch, FaTimes } from 'react-icons/fa';

const LabelSearchBar = ({
  searchTerm,
  selectedLabel,
  labels,
  onSearch
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const [localLabel, setLocalLabel] = useState(selectedLabel || '');
  const [labelOptions, setLabelOptions] = useState(labels || []);
  const [isLoading, setIsLoading] = useState(true);
  const labelsCache = useRef(new Map());

  // Debounced function to fetch labels
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

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchTerm, localLabel === '' ? '' : localLabel);
  };

  // Handle label change
  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    setLocalLabel(newLabel);
  };

  // Handle search input change with auto-search after delay
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);

    // Clear search if input is empty
    if (value === '') {
      onSearch('', localLabel);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="label-search-bar">
      <div className="label-search-input-container">
        <FaSearch className="label-search-icon" size={14} />
        <input
          type="text"
          value={localSearchTerm}
          onChange={handleSearchChange}
          placeholder="Cari judul atau konten artikel..."
          className="label-search-input"
        />
        {localSearchTerm && (
          <button
            type="button"
            className="label-search-clear"
            onClick={() => {
              setLocalSearchTerm('');
              onSearch('', localLabel);
            }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      <div className="label-search-filters">
        <select
          value={localLabel}
          onChange={handleLabelChange}
          className="label-filter-select"
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

      <button type="submit" className="label-search-button">Cari</button>
    </form>
  );
};

export default LabelSearchBar;
