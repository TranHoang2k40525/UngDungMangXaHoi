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
    const token = localStorage.getItem('accessToken');
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

  // Đăng ký
  async register(adminData) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.register(adminData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP
  async verifyOtp(otpData) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.verifyOtp(otpData);
      
      // Lưu thông tin admin
      const adminInfo = {
        email: otpData.Email,
        accountType: 'Admin',
        adminLevel: 'SuperAdmin'
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

  // Đăng nhập
  async login(credentials) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.login(credentials);
      
      // Lưu thông tin admin
      const adminInfo = {
        email: credentials.Email || credentials.Phone,
        accountType: 'Admin',
        adminLevel: 'SuperAdmin'
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
      const { authAPI } = await import('../API/Api.js');
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminInfo');
      
      this.admin = null;
      this.isAuthenticated = false;
      this.notifyListeners();
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.refreshToken();
      return { success: true, data: result };
    } catch (error) {
      // Token refresh failed, logout admin
      await this.logout();
      return { success: false, error: error.message };
    }
  }

  // Setup auto refresh token
  setupTokenRefresh() {
    const refreshToken = localStorage.getItem('refreshToken');
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
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.forgotPassword(email);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP quên mật khẩu
  async verifyForgotPasswordOtp(data) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.verifyForgotPasswordOtp(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset mật khẩu
  async resetPassword(data) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.resetPassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(data) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.changePassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP đổi mật khẩu
  async verifyChangePasswordOtp(data) {
    try {
      const { authAPI } = await import('../API/Api.js');
      const result = await authAPI.verifyChangePasswordOtp(data);
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