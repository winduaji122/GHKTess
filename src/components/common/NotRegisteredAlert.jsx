import React from 'react';
import { FaExclamationTriangle, FaUserPlus, FaPen } from 'react-icons/fa';
import './NotRegisteredAlert.css';

const NotRegisteredAlert = ({ email, onClose, onRegisterUser, onRegisterWriter }) => {
  return (
    <div className="not-registered-alert">
      <div className="not-registered-icon">
        <FaExclamationTriangle />
      </div>
      <h3 className="not-registered-title">Akun Belum Terdaftar</h3>
      <p className="not-registered-message">
        Email <strong>{email}</strong> belum terdaftar di sistem kami.
      </p>
      <div className="not-registered-actions">
        <button
          onClick={onRegisterUser}
          className="not-registered-button user"
        >
          <FaUserPlus className="not-registered-button-icon" />
          <span>Daftar sebagai Pengguna</span>
        </button>
        <button
          onClick={onRegisterWriter}
          className="not-registered-button writer"
        >
          <FaPen className="not-registered-button-icon" />
          <span>Daftar sebagai Writer</span>
        </button>
      </div>
      <button className="not-registered-close" onClick={onClose}>
        &times;
      </button>
    </div>
  );
};

export default NotRegisteredAlert;
