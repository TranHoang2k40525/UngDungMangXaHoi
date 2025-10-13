// ResetPasswordPage.js - Xử lý logic cho trang đặt lại mật khẩu
class ResetPasswordPage {
  constructor() {
    this.authService = new AuthService();
    this.email = this.getEmailFromUrl();
    this.otp = this.getOtpFromUrl();
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupPasswordToggle();
    this.setupRealTimeValidation();
    this.checkRequiredParams();
  }

  bindEvents() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
    }
  }

  setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll('[id^="toggle"]');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const inputId = button.id.replace('toggle', '').toLowerCase();
        UIUtils.togglePasswordVisibility(inputId, button.id);
      });
    });
  }

  setupRealTimeValidation() {
    // Validate new password
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validatePassword(newPasswordInput.value);
        UIUtils.validateInput(newPasswordInput, isValid, 
          isValid ? '' : 'Mật khẩu phải có ít nhất 8 ký tự');
      });
    }

    // Validate confirm password
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('blur', () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const isValid = newPassword === confirmPassword && newPassword.length > 0;
        UIUtils.validateInput(confirmPasswordInput, isValid, 
          isValid ? '' : 'Mật khẩu xác nhận không khớp');
      });
    }
  }

  checkRequiredParams() {
    if (!this.email || !this.otp) {
      UIUtils.showAlert('Thiếu thông tin cần thiết. Vui lòng quay lại trang quên mật khẩu.');
      UIUtils.redirect('forgot-password.html');
    }
  }

  getEmailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email') || '';
  }

  getOtpFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('otp') || '';
  }

  async handleResetPassword(e) {
    e.preventDefault();
    
    const resetBtn = document.getElementById('resetBtn');
    const msgElement = document.getElementById('msg');
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate password
    const validation = ValidationUtils.validatePasswordForm({
      password: newPassword,
      confirmPassword: confirmPassword
    });
    if (!validation.isValid) {
      UIUtils.showError(msgElement, validation.errors.join(', '));
      return;
    }

    if (newPassword !== confirmPassword) {
      UIUtils.showError(msgElement, 'Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(resetBtn, 'Đang đặt lại...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API reset password
      const result = await this.authService.resetPassword({
        Email: this.email,
        Otp: this.otp,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword
      });
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
        UIUtils.redirectWithDelay('login.html', 2000);
      } else {
        UIUtils.showError(msgElement, result.error || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(resetBtn);
    }
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResetPasswordPage();
});
