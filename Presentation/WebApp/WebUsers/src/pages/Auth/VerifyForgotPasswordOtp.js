import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Login.css';

export default function VerifyForgotPasswordOtp() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { verifyForgotPasswordOtp } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      alert('Vui lòng nhập email và OTP');
      return;
    }

    setIsLoading(true);
    const payload = {
      Email: email,
      OtpCode: otp,
    };
    const result = await verifyForgotPasswordOtp(payload);
    if (result.success) {
      navigate('/reset-password', { state: { email } });
    } else {
      alert(result.error || 'Xác thực OTP thất bại');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Xác thực OTP quên mật khẩu</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="text"
              placeholder="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang xác thực...' : 'Xác thực'}
          </button>
        </form>
        <div className="auth-switch">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
