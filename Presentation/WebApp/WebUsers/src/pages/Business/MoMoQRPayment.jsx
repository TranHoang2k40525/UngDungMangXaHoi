import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestBusinessUpgrade, checkPaymentStatus } from '../../api/businessApi';
import './BusinessUpgrade.css';

export default function MoMoQRPayment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5 minutes
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollingInterval = useRef(null);
  const countdownInterval = useRef(null);

  useEffect(() => {
    initiatePayment();
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

  const initiatePayment = async () => {
    try {
      setLoading(true);
      const response = await requestBusinessUpgrade();
      
      if (response?.success) {
        const { qrCodeUrl: qrUrl, paymentId: pId, remainingSeconds: remSec } = response.data;
        setQrCodeUrl(qrUrl);
        setPaymentId(pId);
        setRemainingSeconds(remSec || 300);
        
        startPaymentPolling(pId);
        startCountdown();
      } else {
        throw new Error(response?.message || 'Không thể tạo mã QR thanh toán');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      if (window.confirm('Không thể khởi tạo thanh toán. Vui lòng thử lại.\n\nNhấn OK để thử lại, Cancel để quay lại.')) {
        initiatePayment();
      } else {
        navigate('/profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (pId) => {
    pollingInterval.current = setInterval(async () => {
      await checkPayment(pId);
    }, 3000); // Poll every 3 seconds
  };

  const startCountdown = () => {
    countdownInterval.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          clearInterval(pollingInterval.current);
          handlePaymentExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const checkPayment = async (pId) => {
    if (checkingPayment) return;
    
    try {
      setCheckingPayment(true);
      const response = await checkPaymentStatus(pId);
      
      if (response?.success) {
        const status = response.status?.toLowerCase();
        
        if (status === 'success' || status === 'completed') {
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentSuccess();
        } else if (status === 'failed') {
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentFailed();
        } else if (status === 'expired') {
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentExpired();
        }
      }
    } catch (error) {
      console.error('Payment check error:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    alert('Thành công! 🎉\n\nTài khoản của bạn đã được nâng cấp lên doanh nghiệp thành công!');
    window.location.href = '/profile'; // Force reload to update account type
  };

  const handlePaymentFailed = () => {
    if (window.confirm('Thanh toán thất bại\n\nGiao dịch không thành công. Vui lòng thử lại.\n\nNhấn OK để thử lại, Cancel để hủy.')) {
      navigate('/business/momo-payment');
    } else {
      navigate('/profile');
    }
  };

  const handlePaymentExpired = () => {
    if (window.confirm('Mã QR đã hết hạn\n\nMã QR thanh toán đã hết hiệu lực. Vui lòng tạo mã mới.\n\nNhấn OK để tạo mã mới, Cancel để hủy.')) {
      initiatePayment();
    } else {
      navigate('/profile');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy giao dịch này?')) {
      clearInterval(pollingInterval.current);
      clearInterval(countdownInterval.current);
      navigate('/profile');
    }
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner">⏳</div>
        <p>Đang tạo mã QR thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="business-upgrade-container">
      {/* Header */}
      <div className="business-header">
        <button onClick={handleCancel} className="back-button">
          ✕
        </button>
        <h1>Thanh toán MoMo</h1>
      </div>

      {/* Content */}
      <div className="business-content payment-content">
        {/* Timer */}
        <div className={`timer-container ${remainingSeconds < 60 ? 'warning' : ''}`}>
          <span>🕐</span>
          <span className="timer-text">
            Mã QR hết hạn sau: {formatTime(remainingSeconds)}
          </span>
        </div>

        {remainingSeconds < 60 && (
          <div className="timer-warning-text">
            ⚠️ Mã QR sắp hết hạn! Vui lòng thanh toán ngay.
          </div>
        )}

        {/* QR Code */}
        <div className="qr-container">
          <div className="qr-header">
            <h3>Quét mã QR để thanh toán</h3>
            <p>Mở ứng dụng MoMo và quét mã QR bên dưới</p>
          </div>

          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="MoMo QR Code" className="qr-image" />
          ) : (
            <div className="qr-placeholder">
              <div className="spinner">⏳</div>
            </div>
          )}

          <div className="qr-footer">
            <div className="payment-amount">
              <span className="amount-label">Số tiền:</span>
              <span className="amount-value">1.000 VND</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="payment-instructions">
          <h4>Hướng dẫn thanh toán:</h4>
          <ol>
            <li>Mở ứng dụng MoMo trên điện thoại</li>
            <li>Chọn "Quét mã QR" từ màn hình chính</li>
            <li>Quét mã QR hiển thị trên màn hình này</li>
            <li>Xác nhận thanh toán trong ứng dụng MoMo</li>
            <li>Chờ hệ thống xử lý (tự động kiểm tra)</li>
          </ol>
        </div>

        {/* Checking Status */}
        {checkingPayment && (
          <div className="checking-status">
            <div className="spinner">⏳</div>
            <span>Đang kiểm tra trạng thái thanh toán...</span>
          </div>
        )}
      </div>
    </div>
  );
}
