import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import './Login.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert('Vui lòng nhập email đã đăng ký');
      return;
    }
    setIsLoading(true);
    const result = await forgotPassword(email);
    if (result.success) {
      alert('Đã gửi OTP về email nếu tồn tại.');
      navigate('/verify-forgot-password-otp', { state: { email } });
    } else {
      alert(result.error || 'Gửi OTP thất bại');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Quên mật khẩu</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email đã đăng ký"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Gửi OTP'}
          </button>
        </form>
        <div className="auth-switch">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
