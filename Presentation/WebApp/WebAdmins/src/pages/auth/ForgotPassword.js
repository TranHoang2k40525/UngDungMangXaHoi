import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api.js';
import './Auth.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Nhập email, 2: Nhập mã OTP, 3: Đổi mật khẩu mới
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.forgotPassword(formData.email);
      setSuccess('Mã xác thực đã được gửi đến email của bạn!');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Gửi mã xác thực thất bại. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.resetPassword({
        Email: formData.email,
        Otp: formData.otp,
        NewPassword: formData.newPassword,
      });
      setSuccess('Đổi mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
      setStep(3);
      
      // Auto redirect sau 3 giây
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">SNAP67CS Admin</div>
        <h2 className="auth-title">Quên mật khẩu</h2>

        {step === 1 && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <p className="auth-description">
              Nhập email của bạn để nhận mã xác thực đặt lại mật khẩu
            </p>

            <div className="form-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="input"
                required
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="loading"></span> : 'Gửi mã xác thực'}
            </button>

            <div className="auth-links">
              <Link to="/login">← Quay lại đăng nhập</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <p className="auth-description">
              Nhập mã OTP đã được gửi đến email <strong>{formData.email}</strong> và mật khẩu mới
            </p>

            <div className="form-group">
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder="Mã OTP (6 số)"
                className="input"
                required
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  className="input"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Xác nhận mật khẩu mới"
                className="input"
                required
                minLength={8}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="loading"></span> : 'Đặt lại mật khẩu'}
            </button>

            <div className="auth-links">
              <button 
                type="button" 
                onClick={handleSendOTP} 
                className="link-button"
                disabled={loading}
              >
                Gửi lại mã OTP
              </button>
              <Link to="/login">← Quay lại đăng nhập</Link>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="auth-form">
            <div className="success-icon">✓</div>
            <div className="success-message large">
              Đổi mật khẩu thành công!
            </div>
            <p className="auth-description">
              Đang chuyển hướng về trang đăng nhập...
            </p>
            <Link to="/login" className="btn btn-primary btn-block">
              Đăng nhập ngay
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
