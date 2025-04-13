import React from 'react';

const UploadProgress = ({ status }) => {
  if (!status?.isUploading) return null;

  return (
    <div className="user-profile-upload-progress-wrapper">
      <div className="user-profile-upload-progress-container">
        <div className="user-profile-upload-progress-track">
          <div
            className="user-profile-upload-progress-fill"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <div className="user-profile-upload-progress-info">
          <div className="user-profile-upload-progress-text">
            <span className="user-profile-upload-percentage">{status.progress}%</span>
            {status.speed && (
              <span className="user-profile-upload-speed">
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
