// HomePage.js - Xử lý logic cho trang chủ
class HomePage {
  constructor() {
    this.authService = new AuthService();
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
    this.loadUserInfo();
  }

  bindEvents() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.handleProfile());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleSettings());
    }
  }

  checkAuthentication() {
    if (!this.authService.isAuthenticated()) {
      UIUtils.redirect('login.html');
    }
  }

  loadUserInfo() {
    const user = this.authService.getCurrentUser();
    if (user) {
      // Hiển thị thông tin user
      const userNameElement = document.getElementById('userName');
      if (userNameElement) {
        userNameElement.textContent = user.email || 'User';
      }

      const userEmailElement = document.getElementById('userEmail');
      if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
      }
    }
  }

  handleLogout() {
    if (UIUtils.showConfirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
    }
  }

  handleProfile() {
    // Chuyển đến trang profile (chưa có)
    UIUtils.showAlert('Tính năng profile đang được phát triển');
  }

  handleSettings() {
    // Chuyển đến trang settings (chưa có)
    UIUtils.showAlert('Tính năng settings đang được phát triển');
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new HomePage();
});
