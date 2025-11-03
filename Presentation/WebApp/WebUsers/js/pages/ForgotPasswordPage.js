// ForgotPasswordPage.js - Xử lý logic cho trang quên mật khẩu
class ForgotPasswordPage {
  constructor() {
    this.authService = new AuthService();
    this.step = 1;
    this.email = '';
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
  }

  bindEvents() {
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
    }

    // Real-time validation
    this.setupRealTimeValidation();
  }

  checkAuthentication() {
    if (this.authService.isAuthenticated()) {
      UIUtils.redirect('Home/index.html');
    }
  }

  setupRealTimeValidation() {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validateEmail(emailInput.value);
        UIUtils.validateInput(emailInput, isValid, 
          isValid ? '' : 'Email không hợp lệ');
      });
    }
  }

  async handleForgotPassword(e) {
    e.preventDefault();
    
    const forgotBtn = document.getElementById('forgotBtn');
    const msgElement = document.getElementById('msg');
    const email = document.getElementById('email').value;

    // Validate email
    if (!ValidationUtils.validateEmail(email)) {
      UIUtils.showError(msgElement, 'Email không hợp lệ');
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(forgotBtn, 'Đang gửi...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API forgot password
      const result = await this.authService.forgotPassword(email);
      
      if (result.success) {
        this.email = email;
        this.step = 2;
        this.showStep2();
        UIUtils.showSuccess(msgElement, 'Mã OTP đã được gửi đến email của bạn!');
      } else {
        UIUtils.showError(msgElement, result.error || 'Không thể gửi mã OTP');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(forgotBtn);
    }
  }

  showStep2() {
    // Ẩn step 1
    const step1 = document.getElementById('step1');
    if (step1) {
      step1.style.display = 'none';
    }

    // Hiển thị step 2
    const step2 = document.getElementById('step2');
    if (step2) {
      step2.style.display = 'block';
    }

    // Focus vào OTP input
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.focus();
    }
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
      // Gọi API verify forgot password OTP
      const result = await this.authService.verifyForgotPasswordOtp({
        Email: this.email,
        Otp: otp
      });
      
      if (result.success) {
        // Chuyển sang trang đặt lại mật khẩu với email và OTP
        UIUtils.showSuccess(msgElement, 'Xác thực OTP thành công! Chuyển đến trang đặt lại mật khẩu...');
        UIUtils.redirectWithDelay(`reset-password.html?email=${encodeURIComponent(this.email)}&otp=${encodeURIComponent(otp)}`, 1500);
      } else {
        UIUtils.showError(msgElement, result.error || 'Mã OTP không đúng');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(verifyBtn);
    }
  }

}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new ForgotPasswordPage();
});
