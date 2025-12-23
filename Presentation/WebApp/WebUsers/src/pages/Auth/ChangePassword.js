import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import './Login.css';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: yêu cầu đổi, 2: nhập OTP xác thực
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword, verifyChangePasswordOtp } = useUser();

  const handleRequestChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      alert('Vui lòng nhập đầy đủ và đảm bảo mật khẩu mới khớp nhau');
      return;
    }
    setIsLoading(true);
    const payload = {
      CurrentPassword: currentPassword,
      NewPassword: newPassword,
    };
    const result = await changePassword(payload);
    if (result.success) {
      alert('Đã gửi OTP xác nhận tới email/điện thoại của bạn');
      setStep(2);
    } else {
      alert(result.error || 'Yêu cầu đổi mật khẩu thất bại');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      alert('Vui lòng nhập OTP');
      return;
    }
    setIsLoading(true);
    const payload = {
      OtpCode: otp,
    };
    const result = await verifyChangePasswordOtp(payload);
    if (result.success) {
      alert('Đổi mật khẩu thành công');
      setStep(1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
    } else {
      alert(result.error || 'Xác thực OTP thất bại');
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Đổi mật khẩu</h1>
        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRequestChange}>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button className="auth-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đổi mật khẩu'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="auth-input-group">
              <input
                type="text"
                placeholder="Mã OTP xác nhận"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button className="auth-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>
          </form>
        )}
        <div className="auth-switch">
          <Link to="/">Quay lại trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
