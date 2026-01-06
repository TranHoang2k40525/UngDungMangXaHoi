import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessUpgrade.css';

export default function BusinessPaymentPackage() {
  const navigate = useNavigate();

  const handleSelectPackage = () => {
    if (window.confirm('Bạn có chắc chắn muốn nâng cấp tài khoản doanh nghiệp với gói 1.000 VND/năm?')) {
      navigate('/business/momo-payment');
    }
  };

  return (
    <div className="business-upgrade-container">
      {/* Header */}
      <div className="business-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ←
        </button>
        <h1>Chọn gói nâng cấp</h1>
      </div>

      {/* Content */}
      <div className="business-content package-content">
        <h2 className="package-title">Gói tài khoản doanh nghiệp</h2>
        <p className="package-subtitle">
          Nâng tầm thương hiệu của bạn với tài khoản doanh nghiệp
        </p>

        {/* Package Card */}
        <div className="package-card">
          <div className="package-header">
            <div className="package-icon">
              💼
            </div>
            <h3>Business Premium</h3>
          </div>

          <div className="package-price">
            <span className="price-amount">1.000 VND</span>
            <span className="price-period">/tháng</span>
          </div>

          <div className="package-divider"></div>

          <div className="package-benefits">
            <h4>Quyền lợi bao gồm:</h4>
            
            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Dấu tích xanh xác thực</span>
            </div>

            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Quảng cáo bài viết của bạn</span>
            </div>

            <div className="benefit-item">
              <span className="check-icon">✓</span>
              <span>Ưu tiên hiển thị nội dung</span>
            </div>
          </div>

          <div className="package-divider"></div>

          <div className="package-duration">
            
            <span>Thời gian hiệu lực: 1 tháng</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="payment-info">
          
          <p>Thanh toán qua MoMo QR Code. Mã QR có hiệu lực trong 5 phút.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="business-footer">
        <button
          className="continue-button"
          onClick={handleSelectPackage}
        >
          <span>Tiếp tục thanh toán</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
