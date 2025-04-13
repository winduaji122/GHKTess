import React, { useState, useEffect } from 'react';
import { getUniqueLabels } from '../api/labelApi';

const LabelComponent = ({ selectedLabelIds, onLabelChange }) => {
  const [labels, setLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labelsData = await getUniqueLabels();
        setLabels(labelsData || []);
      } catch (err) {
        console.error('Error mengambil label:', err);
        setError('Gagal mengambil data label. Silakan coba lagi nanti.');
      }
    };

    fetchLabels();
  }, []);

  if (isLoading) return <p>Memuat label...</p>;
  if (error) return <p className="error-message">{error}</p>;

  const handleLabelChange = (labelId) => {
    onLabelChange(labelId);
  };

  return (
    <div className="label-options">
      {labels.length > 0 ? (
        labels.map(label => (
          <label key={label.id} className="label-item">
            <input
              type="checkbox"
              value={label.id}
              checked={selectedLabelIds.includes(label.id)}
              onChange={() => handleLabelChange(label.id)}
            /> {label.label}
          </label>
        ))
      ) : (
        <p>Tidak ada label yang tersedia</p>
      )}
    </div>
  );
};

export default LabelComponent;