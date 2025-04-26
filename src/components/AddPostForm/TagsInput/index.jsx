import React, { useState, useEffect } from 'react';
import './TagsInput.css';
import { FaTimes } from 'react-icons/fa';

const TagsInput = ({ value, onChange, placeholder = 'Tambahkan tag SEO...' }) => {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Parse tags from value (comma-separated string)
  useEffect(() => {
    if (value) {
      const tagArray = value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
      setTags(tagArray);
    } else {
      setTags([]);
    }
  }, [value]);

  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Handle key down (Enter and Backspace)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed and input is empty
      removeTag(tags.length - 1);
    } else if (e.key === ',' && inputValue.trim() !== '') {
      // Add tag when comma is pressed
      e.preventDefault();
      addTag(inputValue);
    }
  };

  // Add a new tag
  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag === '') return;
    
    // Check if tag already exists
    if (!tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      onChange(newTags.join(','));
    }
    setInputValue('');
  };

  // Remove a tag
  const removeTag = (index) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
    onChange(newTags.join(','));
  };

  // Handle blur event (add tag when focus is lost)
  const handleBlur = () => {
    if (inputValue.trim() !== '') {
      addTag(inputValue);
    }
  };

  return (
    <div className="writer-tags-input-container">
      <div className="writer-tags-input">
        {tags.map((tag, index) => (
          <div key={index} className="writer-tag">
            <span>{tag}</span>
            <button
              type="button"
              className="writer-tag-remove"
              onClick={() => removeTag(index)}
            >
              <FaTimes />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="writer-tags-input-field"
        />
      </div>
      <div className="writer-tags-hint">
        Tekan Enter atau koma untuk menambahkan tag
      </div>
    </div>
  );
};

export default TagsInput;
