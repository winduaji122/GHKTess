import React from 'react';

const UploadProgress = ({ status }) => {
  if (!status?.isUploading) return null;

  return (
    <div className="writer-upload-progress-wrapper">
      <div className="writer-upload-progress-container">
        <div className="writer-upload-progress-track">
          <div
            className="writer-upload-progress-fill"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <div className="writer-upload-progress-info">
          <div className="writer-upload-progress-text">
            <span className="writer-upload-percentage">{status.progress}%</span>
            {status.speed && (
              <span className="writer-upload-speed">
                {status.speed} MB/s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;