import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Signup.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email && !phone) {
      alert('Vui lòng nhập email hoặc số điện thoại');
      return;
    }
    if (!password) {
      alert('Vui lòng nhập mật khẩu');
      return;
    }

    setIsLoading(true);
    const payload = {
      Email: email || null,
      Phone: phone || null,
      Password: password,
      FullName: fullName || null,
    };

    const result = await register(payload);
    if (result.success) {
      alert('Đăng ký thành công, vui lòng kiểm tra OTP trong email/SMS.');
      navigate('/verify-otp');
    } else {
      alert(result.error || 'Đăng ký thất bại');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">MediaLite</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="text"
              placeholder="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email (tuỳ chọn)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="tel"
              placeholder="Số điện thoại (tuỳ chọn)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <div className="auth-divider">
          <span>OR</span>
        </div>
        <div className="auth-switch">
          <span>Đã có tài khoản? </span>
          <Link to="/login">Đăng nhập</Link>
        </div>
        <div className="auth-footer">Snap67CS</div>
      </div>
    </div>
  );
}
