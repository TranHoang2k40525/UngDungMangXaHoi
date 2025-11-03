// VerifyOtpPage.js - Xử lý logic cho trang verify OTP
class VerifyOtpPage {
  constructor() {
    this.authService = new AuthService();
    this.email = this.getEmailFromUrl();
    this.countdown = 60;
    this.canResend = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.startCountdown();
    this.checkAuthentication();
  }

  bindEvents() {
    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
      verifyForm.addEventListener('submit', (e) => this.handleVerifyOtp(e));
    }

    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
      resendBtn.addEventListener('click', () => this.handleResendOtp());
    }

    // Auto-focus OTP input
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.focus();
    }

    // Real-time validation
    this.setupRealTimeValidation();
  }

  checkAuthentication() {
    if (this.authService.isAuthenticated()) {
      UIUtils.redirect('Home/index.html');
    }
  }

  getEmailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email') || '';
  }

  setupRealTimeValidation() {
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.addEventListener('input', (e) => {
        const value = e.target.value;
        // Chỉ cho phép nhập số
        e.target.value = value.replace(/\D/g, '');
        // Giới hạn 6 ký tự
        if (e.target.value.length > 6) {
          e.target.value = e.target.value.slice(0, 6);
        }
      });

      otpInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validateOtp(otpInput.value);
        UIUtils.validateInput(otpInput, isValid, 
          isValid ? '' : 'Mã OTP phải có 6 chữ số');
      });
    }
  }

  startCountdown() {
    const resendBtn = document.getElementById('resendBtn');
    const countdownElement = document.getElementById('countdown');
    
    if (!resendBtn) return;

    resendBtn.disabled = true;
    this.canResend = false;

    const timer = setInterval(() => {
      this.countdown--;
      
      if (countdownElement) {
        countdownElement.textContent = this.countdown;
      }
      
      if (this.countdown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        this.canResend = true;
        resendBtn.textContent = 'Gửi lại mã';
        if (countdownElement) {
          countdownElement.textContent = '';
        }
      } else {
        resendBtn.textContent = `Gửi lại mã (${this.countdown}s)`;
      }
    }, 1000);
  }

  async handleVerifyOtp(e) {
    e.preventDefault();
    
    const verifyBtn = document.getElementById('verifyBtn');
    const msgElement = document.getElementById('msg');
    const otp = document.getElementById('otp').value;

    // Validate OTP
    const validation = ValidationUtils.validateOtpForm(otp);
    if (!validation.isValid) {
      UIUtils.showError(msgElement, validation.errors.join(', '));
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(verifyBtn, 'Đang xác thực...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API verify OTP
      const result = await this.authService.verifyOtp({
        Email: this.email,
        Otp: otp
      });
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Xác thực OTP thành công!');
        UIUtils.redirectWithDelay('Home/index.html', 1500);
      } else {
        UIUtils.showError(msgElement, result.error || 'Mã OTP không đúng');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(verifyBtn);
    }
  }

  async handleResendOtp() {
    if (!this.canResend) return;
    
    const resendBtn = document.getElementById('resendBtn');
    const msgElement = document.getElementById('msg');

    // Hiển thị loading
    UIUtils.showLoading(resendBtn, 'Đang gửi...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API resend OTP
      const result = await this.authService.register({
        Email: this.email,
        // Có thể cần thêm các field khác tùy theo API
      });
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Mã OTP mới đã được gửi!');
        this.startCountdown();
      } else {
        UIUtils.showError(msgElement, result.error || 'Không thể gửi lại mã OTP');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(resendBtn);
    }
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new VerifyOtpPage();
});
