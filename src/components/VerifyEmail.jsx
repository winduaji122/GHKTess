// src/components/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const [status, setStatus] = useState('memverifikasi');
  const [message, setMessage] = useState('Memverifikasi...');
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const result = await userService.verifyEmail(token);
        if (result.success) {
          setStatus('berhasil');
          setMessage(result.message);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('gagal');
          setMessage(result.message);
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('gagal');
        setMessage('Terjadi kesalahan saat memverifikasi email. Silakan coba lagi nanti.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'memverifikasi':
        return <p className="info-message">{message}</p>;
      case 'berhasil':
        return (
          <>
            <p className="success-message">{message}</p>
            <p>Anda akan diarahkan ke halaman login dalam beberapa detik. Jika tidak, klik <a href="/login">di sini</a>.</p>
          </>
        );
      case 'gagal':
        return (
          <>
            <p className="error-message">{message}</p>
            <button 
              onClick={() => navigate('/')} 
              className="back-button"
            >
              Kembali ke Beranda
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="verify-email-container">
      <h2>Verifikasi Email</h2>
      {renderContent()}
    </div>
  );
};

export default VerifyEmail;