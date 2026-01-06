import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessUpgrade.css';

export default function BusinessUpgradeTerms() {
  const navigate = useNavigate();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleContinue = () => {
    if (!agreedToTerms) {
      alert('Vui lòng đồng ý với điều khoản để tiếp tục');
      return;
    }
    navigate('/business/payment-package');
  };

  return (
    <div className="business-upgrade-container">
      {/* Header */}
      <div className="business-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← 
        </button>
        <h1>Nâng cấp tài khoản doanh nghiệp</h1>
      </div>

      {/* Content */}
      <div className="business-content">
        <div className="terms-section">
          <h2>Điều khoản và Điều kiện</h2>
          <p className="intro-text">
            Chào mừng bạn đến với chương trình nâng cấp tài khoản doanh nghiệp của chúng tôi. 
            Vui lòng đọc kỹ các điều khoản sau đây trước khi tiến hành nâng cấp.
          </p>
        </div>

        <div className="terms-section">
          <h3>1. Quyền lợi tài khoản doanh nghiệp</h3>
          <ul>
            <li>Dấu tích xanh xác thực bên cạnh tên tài khoản</li>
            <li>Hiển thị bài viết quảng cáo trong nguồn cấp của người dùng</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>2. Chi phí và thanh toán</h3>
          <ul>
            <li>Phí nâng cấp: 1.000 VND/tháng</li>
            <li>Thanh toán qua MoMo QR Code</li>
            <li>Thời gian hiệu lực: 30 ngày kể từ ngày thanh toán thành công</li>
            <li>Mã QR có hiệu lực trong 5 phút</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>3. Chính sách hoàn tiền</h3>
          <ul>
            <li>Không hoàn tiền sau khi đã nâng cấp thành công</li>
            <li>Trong trường hợp thanh toán bị lỗi, số tiền sẽ được hoàn lại tự động trong vòng 24 giờ</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>4. Quy định sử dụng</h3>
          <ul>
            <li>Tài khoản doanh nghiệp phải tuân thủ các quy định cộng đồng</li>
            <li>Nội dung quảng cáo phải phù hợp và không vi phạm pháp luật</li>
            <li>Chúng tôi có quyền tạm ngưng tài khoản nếu phát hiện hành vi gian lận hoặc vi phạm</li>
            <li>Không được chuyển nhượng quyền lợi tài khoản doanh nghiệp cho người khác</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>5. Liên hệ hỗ trợ</h3>
          <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ:</p>
          <ul>
            <li>Email: hoangzai2k403@gmail.com</li>
            <li>Hotline: 0388672504</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="business-footer">
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
          <span className="checkbox-label">
            Tôi đồng ý với các điều khoản và điều kiện
          </span>
        </label>

        <button
          className={`continue-button ${!agreedToTerms ? 'disabled' : ''}`}
          onClick={handleContinue}
          disabled={!agreedToTerms}
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}
