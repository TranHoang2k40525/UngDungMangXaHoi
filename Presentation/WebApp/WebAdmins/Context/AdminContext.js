// AdminContext cho WebAdmins
class AdminContext {
  constructor() {
    this.admin = null;
    this.isAuthenticated = false;
    this.listeners = [];
    this.init();
  }

  // Khởi tạo
  init() {
    this.checkAuthStatus();
    this.setupTokenRefresh();
  }

  // Kiểm tra trạng thái đăng nhập
  checkAuthStatus() {
    const token = localStorage.getItem('adminAccessToken');
    const adminInfo = localStorage.getItem('adminInfo');
    
    if (token && adminInfo) {
      this.admin = JSON.parse(adminInfo);
      this.isAuthenticated = true;
    } else {
      this.admin = null;
      this.isAuthenticated = false;
    }
    
    this.notifyListeners();
  }

  // Đăng ký listener
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Thông báo cho tất cả listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      callback({
        admin: this.admin,
        isAuthenticated: this.isAuthenticated
      });
    });
  }

  // Đăng ký admin
  async register(adminData) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.register(adminData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP
  async verifyOtp(otpData) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.verifyOtp(otpData);
      
      // Lưu thông tin admin
      const adminInfo = {
        email: otpData.Email,
        accountType: 'Admin',
      };
      localStorage.setItem('adminInfo', JSON.stringify(adminInfo));
      
      this.admin = adminInfo;
      this.isAuthenticated = true;
      this.notifyListeners();
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng nhập admin
  async login(credentials) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.login(credentials);
      
      // Lưu thông tin admin
      const adminInfo = {
        email: credentials.Email || credentials.Phone,
        accountType: 'Admin',
      };
      localStorage.setItem('adminInfo', JSON.stringify(adminInfo));
      
      this.admin = adminInfo;
      this.isAuthenticated = true;
      this.notifyListeners();
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng xuất
  async logout() {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      await apiModule.authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminInfo');
      
      this.admin = null;
      this.isAuthenticated = false;
      this.notifyListeners();
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.refreshToken();
      return { success: true, data: result };
    } catch (error) {
      // Token refresh failed, logout admin
      await this.logout();
      return { success: false, error: error.message };
    }
  }

  // Setup auto refresh token
  setupTokenRefresh() {
    const refreshToken = localStorage.getItem('adminRefreshToken');
    if (!refreshToken) return;

    // Kiểm tra token mỗi 5 phút
    setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }, 5 * 60 * 1000); // 5 phút
  }

  // Quên mật khẩu
  async forgotPassword(email) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.forgotPassword(email);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP quên mật khẩu
  async verifyForgotPasswordOtp(data) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.verifyForgotPasswordOtp(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset mật khẩu
  async resetPassword(data) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.resetPassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(data) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.changePassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP đổi mật khẩu
  async verifyChangePasswordOtp(data) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.authAPI.verifyChangePasswordOtp(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách users
  async getAllUsers() {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.adminAPI.getAllUsers();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách reports
  async getAllReports() {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.adminAPI.getAllReports();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Moderation
  async moderateContent(data) {
    try {
      const response = await fetch('/pages/API/Api.js');
      const apiModule = await import('/pages/API/Api.js');
      const result = await apiModule.adminAPI.moderateContent(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Tạo instance global
const adminContext = new AdminContext();

// Export cho sử dụng
window.AdminContext = adminContext;
