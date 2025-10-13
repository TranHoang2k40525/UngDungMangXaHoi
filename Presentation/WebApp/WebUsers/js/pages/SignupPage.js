// SignupPage.js - Xử lý logic cho trang đăng ký
class SignupPage {
  constructor() {
    this.authService = new AuthService();
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
    this.setupDateInput();
  }

  bindEvents() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Real-time validation
    this.setupRealTimeValidation();
  }

  checkAuthentication() {
    if (this.authService.isAuthenticated()) {
      UIUtils.redirect('Home/index.html');
    }
  }

  setupDateInput() {
    const dateInput = document.getElementById('birthDate');
    if (dateInput) {
      dateInput.max = DateUtils.getMaxDate();
      dateInput.min = DateUtils.getMinDate();
    }
  }

  setupRealTimeValidation() {
    // Validate username
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
      usernameInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validateUsername(usernameInput.value);
        UIUtils.validateInput(usernameInput, isValid, 
          isValid ? '' : 'Username phải có 3-20 ký tự và chỉ chứa chữ cái, số, dấu gạch dưới');
      });
    }

    // Validate email
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validateEmail(emailInput.value);
        UIUtils.validateInput(emailInput, isValid, 
          isValid ? '' : 'Email không hợp lệ');
      });
    }

    // Validate phone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validatePhone(phoneInput.value);
        UIUtils.validateInput(phoneInput, isValid, 
          isValid ? '' : 'Số điện thoại không hợp lệ');
      });
    }

    // Validate password
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.addEventListener('blur', () => {
        const isValid = ValidationUtils.validatePassword(passwordInput.value);
        UIUtils.validateInput(passwordInput, isValid, 
          isValid ? '' : 'Mật khẩu phải có ít nhất 8 ký tự');
      });
    }

    // Validate confirm password
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('blur', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const isValid = password === confirmPassword && password.length > 0;
        UIUtils.validateInput(confirmPasswordInput, isValid, 
          isValid ? '' : 'Mật khẩu xác nhận không khớp');
      });
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    const msgElement = document.getElementById('msg');
    
    // Lấy dữ liệu form
    const formData = this.getFormData();

    // Validate form
    const validation = ValidationUtils.validateSignupForm(formData);
    if (!validation.isValid) {
      UIUtils.showError(msgElement, validation.errors.join(', '));
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(signupBtn, 'Đang đăng ký...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API đăng ký
      const result = await this.authService.register(formData);
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Đăng ký thành công! OTP đã được gửi đến email của bạn.');
        UIUtils.redirectWithDelay(`verify-otp.html?email=${encodeURIComponent(formData.Email)}`, 2000);
      } else {
        UIUtils.showError(msgElement, result.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(signupBtn);
    }
  }

  getFormData() {
    const genderValue = document.querySelector('input[name="gender"]:checked').value;
    let genderNumber;
    switch (genderValue) {
      case 'Nam':
        genderNumber = 0;
        break;
      case 'Nữ':
        genderNumber = 1;
        break;
      case 'Khác':
        genderNumber = 2;
        break;
      default:
        genderNumber = 0;
    }
    
    const birthDate = DateUtils.parseDateOfBirth(document.getElementById('birthDate').value);
    
    return {
      Username: document.getElementById('username').value,
      FullName: `${document.getElementById('lastName').value} ${document.getElementById('firstName').value}`,
      DateOfBirth: birthDate.toISOString(), // Gửi dưới dạng ISO string
      Email: document.getElementById('email').value,
      Phone: document.getElementById('phone').value,
      Password: document.getElementById('password').value,
      Gender: genderNumber
    };
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new SignupPage();
});
