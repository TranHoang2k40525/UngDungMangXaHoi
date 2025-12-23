import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Login.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert('Thiếu email, vui lòng thực hiện lại bước quên mật khẩu');
      return;
    }
    if (!password || password !== confirmPassword) {
      alert('Mật khẩu không khớp');
      return;
    }

    setIsLoading(true);
    const payload = {
      Email: email,
      NewPassword: password,
    };
    const result = await resetPassword(payload);
    if (result.success) {
      alert('Đặt lại mật khẩu thành công');
      navigate('/login');
    } else {
      alert(result.error || 'Đặt lại mật khẩu thất bại');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Đặt lại mật khẩu</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </button>
        </form>
        <div className="auth-switch">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
