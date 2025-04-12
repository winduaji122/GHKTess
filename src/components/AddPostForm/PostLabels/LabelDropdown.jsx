import React from 'react';

const LabelDropdown = ({ labels, selectedLabels, onLabelToggle }) => {
  return (
    <div className="label-dropdown">
      <select
        multiple
        value={selectedLabels}
        onChange={(e) => {
          const options = [...e.target.selectedOptions];
          const values = options.map(option => parseInt(option.value));
          onLabelToggle(values);
        }}
      >
        {labels.map(label => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LabelDropdown;