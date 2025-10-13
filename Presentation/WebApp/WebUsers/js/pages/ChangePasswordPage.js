// ChangePasswordPage.js - Xử lý logic cho trang đổi mật khẩu
class ChangePasswordPage {
  constructor() {
    this.authService = new AuthService();
    this.step = 1;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
    this.setupRealTimeValidation();
  }

  bindEvents() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', (e) => this.handleChangePassword(e));
    }

    const verifyOtpForm = document.getElementById('verifyOtpForm');
    if (verifyOtpForm) {
      verifyOtpForm.addEventListener('submit', (e) => this.handleVerifyOtp(e));
    }

    // Toggle password visibility
    this.setupPasswordToggle();
  }

  checkAuthentication() {
    if (!this.authService.isAuthenticated()) {
      UIUtils.redirect('login.html');
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
    // Validate old password
    const oldPasswordInput = document.getElementById('oldPassword');
    if (oldPasswordInput) {
      oldPasswordInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validatePassword(oldPasswordInput.value);
        UIUtils.validateInput(oldPasswordInput, isValid, 
          isValid ? '' : 'Mật khẩu phải có ít nhất 8 ký tự');
      });
    }

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

    // Validate OTP
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validateOtp(otpInput.value);
        UIUtils.validateInput(otpInput, isValid, 
          isValid ? '' : 'Mã OTP phải có 6 chữ số');
      });
    }
  }

  async handleChangePassword(e) {
    e.preventDefault();
    
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const msgElement = document.getElementById('msg');
    
    // Lấy dữ liệu form
    const formData = {
      OldPassword: document.getElementById('oldPassword').value,
      NewPassword: document.getElementById('newPassword').value,
      ConfirmPassword: document.getElementById('confirmPassword').value
    };

    // Validate form
    const validation = ValidationUtils.validatePasswordForm({
      password: formData.NewPassword,
      confirmPassword: formData.ConfirmPassword
    });
    if (!validation.isValid) {
      UIUtils.showError(msgElement, validation.errors.join(', '));
      return;
    }

    if (formData.NewPassword !== formData.ConfirmPassword) {
      UIUtils.showError(msgElement, 'Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(changePasswordBtn, 'Đang gửi OTP...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API đổi mật khẩu (gửi OTP)
      const result = await this.authService.changePassword(formData);
      
      if (result.success) {
        this.step = 2;
        this.showStep2();
        UIUtils.showSuccess(msgElement, 'Mã OTP đã được gửi đến email của bạn!');
      } else {
        UIUtils.showError(msgElement, result.error || 'Không thể gửi mã OTP');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(changePasswordBtn);
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
      // Gọi API verify OTP đổi mật khẩu
      const result = await this.authService.verifyChangePasswordOtp({
        Otp: otp
      });
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Đổi mật khẩu thành công! Chuyển về trang chủ...');
        UIUtils.redirectWithDelay('Home/index.html', 2000);
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
  new ChangePasswordPage();
});
