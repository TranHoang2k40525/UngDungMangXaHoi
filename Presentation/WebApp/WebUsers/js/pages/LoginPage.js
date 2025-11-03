// LoginPage.js - Xử lý logic cho trang login
class LoginPage {
  constructor() {
    this.authService = new AuthService();
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
  }

  bindEvents() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        UIUtils.togglePasswordVisibility('password', 'togglePassword');
      });
    }
  }

  checkAuthentication() {
    if (this.authService.isAuthenticated()) {
      UIUtils.redirect('Home/index.html');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const msgElement = document.getElementById('msg');
    
    // Lấy dữ liệu form
    const identifier = document.getElementById('identifier').value;
    const password = document.getElementById('password').value;
    
    // Xác định email hoặc phone
    const formData = {
      Email: identifier.includes('@') ? identifier : '',
      Phone: !identifier.includes('@') ? identifier : '',
      Password: password
    };
    
    // Loại bỏ các field rỗng
    if (!formData.Email) delete formData.Email;
    if (!formData.Phone) delete formData.Phone;

    // Validate form
    const validation = ValidationUtils.validateLoginForm(formData);
    if (!validation.isValid) {
      UIUtils.showError(msgElement, validation.errors.join(', '));
      return;
    }

    // Hiển thị loading
    UIUtils.showLoading(loginBtn, 'Đang đăng nhập...');
    UIUtils.hideMessage(msgElement);

    try {
      // Gọi API login
      const result = await this.authService.login(formData);
      
      if (result.success) {
        UIUtils.showSuccess(msgElement, 'Đăng nhập thành công!');
        UIUtils.redirectWithDelay('Home/index.html', 1500);
      } else {
        UIUtils.showError(msgElement, result.error || 'Đăng nhập thất bại');
      }
    } catch (error) {
      UIUtils.showError(msgElement, 'Có lỗi xảy ra: ' + error.message);
    } finally {
      UIUtils.hideLoading(loginBtn);
    }
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoginPage();
});
