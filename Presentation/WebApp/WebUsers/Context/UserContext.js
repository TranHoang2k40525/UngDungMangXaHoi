// UserContext cho WebUsers
class UserContext {
  constructor() {
    this.user = null;
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
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
      this.user = JSON.parse(userInfo);
      this.isAuthenticated = true;
    } else {
      this.user = null;
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
        user: this.user,
        isAuthenticated: this.isAuthenticated
      });
    });
  }

  // Đăng ký
  async register(userData) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.register(userData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP
  async verifyOtp(otpData) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.verifyOtp(otpData);
      
      // Lưu thông tin user
      const userInfo = {
        email: otpData.Email,
        accountType: 'User',
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      this.user = userInfo;
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
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.login(credentials);
      
      // Lưu thông tin user
      const userInfo = {
        email: credentials.Email || credentials.Phone,
        accountType: 'User',
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      this.user = userInfo;
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
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      await apiModule.authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
      
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners();
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.refreshToken();
      return { success: true, data: result };
    } catch (error) {
      // Token refresh failed, logout user
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
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.forgotPassword(email);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP quên mật khẩu
  async verifyForgotPasswordOtp(data) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.verifyForgotPasswordOtp(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset mật khẩu
  async resetPassword(data) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.resetPassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(data) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.changePassword(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xác thực OTP đổi mật khẩu
  async verifyChangePasswordOtp(data) {
    try {
      const response = await fetch('/API/Api.js');
      const apiModule = await import('/API/Api.js');
      const result = await apiModule.authAPI.verifyChangePasswordOtp(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Tạo instance global
const userContext = new UserContext();

// Export cho sử dụng
window.UserContext = userContext;
