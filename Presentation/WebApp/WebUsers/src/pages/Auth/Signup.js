import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Signup.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!username.trim()) {
      alert('Vui lòng nhập tên người dùng');
      return;
    }
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên');
      return;
    }
    if (!dateOfBirth) {
      alert('Vui lòng chọn ngày sinh');
      return;
    }
    if (!email.trim()) {
      alert('Vui lòng nhập email');
      return;
    }
    if (!phone.trim()) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }
    if (!password.trim()) {
      alert('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 8) {
      alert('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setIsLoading(true);
    
    // Format DateOfBirth to ISO string
    const dateObj = new Date(dateOfBirth);
    const isoDate = dateObj.toISOString();

    const payload = {
      Username: username,
      FullName: fullName,
      DateOfBirth: isoDate,
      Gender: gender,
      Email: email,
      Phone: phone,
      Password: password,
    };

    console.log('Sending registration data:', payload);

    const result = await register(payload);
    if (result.success) {
      alert('Đăng ký thành công! Vui lòng kiểm tra OTP trong email của bạn.');
      navigate('/verify-otp', { state: { email: email } });
    } else {
      alert(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
    setIsLoading(false);
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <button className="back-button" onClick={() => navigate('/login')}>
            &lt;
          </button>
          <h2 className="signup-title">SIGN UP</h2>
        </div>
        
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên người dùng:</label>
            <input
              type="text"
              placeholder="Nhập tên người dùng"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Họ và tên:</label>
            <input
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group form-group-half">
              <label>Ngày sinh:</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group form-group-half">
              <label>Giới tính:</label>
              <div className="gender-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="Nam"
                    checked={gender === 'Nam'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  <span>Nam</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="Nữ"
                    checked={gender === 'Nữ'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  <span>Nữ</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="Khác"
                    checked={gender === 'Khác'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  <span>Khác</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Số điện thoại:</label>
            <input
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu:</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button 
            className="signup-button" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="signup-footer">
          <span>Đã có tài khoản? </span>
          <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
