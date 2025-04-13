import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import userService from '../services/userService';  // Perubahan di sini

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok.');
      return;
    }

    try {
      const result = await userService.resetPassword(token, password);
      if (result.success) {
        setMessage('Password berhasil direset. Anda akan diarahkan ke halaman login.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(result.error || 'Terjadi kesalahan saat mereset password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mereset password.');
    }
  };

  return (
    <div className="reset-password-container">
      <h2>Reset Password</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">Password Baru:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Konfirmasi Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;