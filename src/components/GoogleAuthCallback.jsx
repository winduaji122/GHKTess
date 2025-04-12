import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

function GoogleAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');

      if (code) {
        try {
          const result = await authService.handleGoogleCallback(code);
          if (result.success) {
            navigate('/dashboard');
          } else {
            navigate('/login', { state: { error: result.error } });
          }
        } catch (error) {
          console.error('Error selama autentikasi:', error);
          navigate('/login', { state: { error: 'Terjadi kesalahan saat autentikasi' } });
        }
      } else {
        navigate('/login', { state: { error: 'Autentikasi dibatalkan' } });
      }
    };

    processCallback();
  }, [location, navigate]);

  return <div>Memproses autentikasi Google...</div>;
}

export default GoogleAuthCallback;