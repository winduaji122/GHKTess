import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './SearchBar.css';
import { debounce } from 'lodash';

const SearchBar = ({
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchTerm, localLabel);
  };

  const handleLabelChange = (e) => {
    const newLabel = e.target.value;
    setLocalLabel(newLabel);
    onSearch(localSearchTerm, newLabel);
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        value={localSearchTerm}
        onChange={(e) => setLocalSearchTerm(e.target.value)}
        placeholder="Cari artikel..."
        className="search-input"
      />

      <div className="search-filters">
        <select
          value={localLabel}
          onChange={handleLabelChange}
          className="filter-select"
          disabled={isLoading}
        >
          <option value="">Semua Label</option>
          {isLoading ? (
            <option value="" disabled>Loading labels...</option>
          ) : (
            labelOptions?.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))
          )}
        </select>
      </div>

      <button type="submit" className="search-button">Cari</button>
    </form>
  );
};

export default SearchBar;
