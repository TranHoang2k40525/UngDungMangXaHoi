import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import './Login.css';       

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      alert('Vui lòng điền email/số điện thoại và mật khẩu.');
      return;
    }

    setIsLoading(true);
    const credentials = {
      Email: identifier.includes('@') ? identifier : '',
      Phone: !identifier.includes('@') ? identifier : '',
      Password: password,
    };

    const result = await login(credentials);
    if (result.success) {
      navigate('/');
    } else {
      alert(result.error || 'Đăng nhập thất bại.');
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
              placeholder="Email hoặc Số điện thoại"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-forgot">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="auth-divider">
          <span>OR</span>
        </div>
        <div className="auth-switch">
          <span>Don't have an account? </span>
          <Link to="/signup">Sign up</Link>
        </div>
        <div className="auth-footer">Snap67CS</div>
      </div>
    </div>
  );
}
