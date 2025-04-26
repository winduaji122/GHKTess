import React, { useState } from 'react';
import './SpotlightSearchBar.css';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SpotlightSearchBar = ({ searchTerm, onSearch }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchTerm);
  };

  // Handle search input change with auto-search after delay
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    
    // Clear search if input is empty
    if (value === '') {
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="spotlight-search-bar">
      <div className="spotlight-search-input-container">
        <FaSearch className="spotlight-search-icon" size={14} />
        <input
          type="text"
          value={localSearchTerm}
          onChange={handleSearchChange}
          placeholder="Cari artikel sorotan..."
          className="spotlight-search-input"
        />
        {localSearchTerm && (
          <button
            type="button"
            className="spotlight-search-clear"
            onClick={() => {
              setLocalSearchTerm('');
              onSearch('');
            }}
          >
            <FaTimes />
          </button>
        )}
      </div>

      <button type="submit" className="spotlight-search-button">Cari</button>
    </form>
  );
};

export default SpotlightSearchBar;
