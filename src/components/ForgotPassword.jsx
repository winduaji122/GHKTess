import React, { useState } from 'react';
import userService from '../services/userService';  // Perubahan di sini

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const result = await userService.forgotPassword(email);
      setMessage('Instruksi reset password telah dikirim ke email Anda.');
    } catch (err) {
      setError('Terjadi kesalahan saat memproses permintaan.');
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Lupa Password</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">Kirim Instruksi Reset Password</button>
      </form>
    </div>
  );
};

export default ForgotPassword;