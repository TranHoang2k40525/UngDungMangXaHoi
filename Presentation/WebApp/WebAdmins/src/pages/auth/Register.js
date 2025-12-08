import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api.js';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Register, 2: Verify OTP
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dateOfBirth: '',
    phone: '',
    gender: 'Nam',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.registerAdmin({
        Email: formData.email,
        Password: formData.password,
        FullName: formData.fullName,
        DateOfBirth: formData.dateOfBirth,
        Phone: formData.phone || null,
        Gender: formData.gender,
      });

      setSuccess('Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Email này có thể chưa được cấp quyền Admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.verifyAdminOtp({
        Email: formData.email,
        Otp: otp,
      });

      setSuccess('Xác thực thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Mã OTP không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">SNAP67CS Admin</div>
        <h2 className="auth-title">{step === 1 ? 'Đăng ký Admin' : 'Xác thực OTP'}</h2>

        {step === 1 ? (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Họ và tên"
                className="input"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email (đã được cấp quyền)"
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                placeholder="Ngày sinh"
                className="input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Số điện thoại (tùy chọn)"
                className="input"
              />
            </div>

            <div className="form-group">
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Xác nhận mật khẩu"
                className="input"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="loading"></span> : 'Đăng ký'}
            </button>

            <div className="auth-links">
              <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <p className="auth-description">
              Mã OTP đã được gửi đến email <strong>{formData.email}</strong>
            </p>

            <div className="form-group">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã OTP (6 số)"
                className="input"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="loading"></span> : 'Xác thực'}
            </button>

            <div className="auth-links">
              <button type="button" onClick={() => setStep(1)} className="link-button">
                ← Quay lại
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
