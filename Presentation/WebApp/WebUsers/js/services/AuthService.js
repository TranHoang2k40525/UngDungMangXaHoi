// AuthService.js - Xử lý logic authentication
class AuthService {
  constructor() {
    this.userContext = new window.UserContext();
  }

  // Đăng nhập
  async login(credentials) {
    try {
      const result = await this.userContext.login(credentials);
      if (result.success) {
        // Lưu thông tin user vào localStorage
        const user = result.data?.user || null;
        if (user) localStorage.setItem('userInfo', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        return { success: true, data: user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng ký
  async register(userData) {
    try {
      const result = await this.userContext.register(userData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOtp(otpData) {
    try {
      const result = await this.userContext.verifyOtp(otpData);
      if (result.success) {
        // Lưu thông tin user vào localStorage
        const user = result.data?.user || null;
        if (user) localStorage.setItem('userInfo', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        return { success: true, data: user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Quên mật khẩu
  async forgotPassword(email) {
    try {
      const result = await this.userContext.forgotPassword(email);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify OTP quên mật khẩu
  async verifyForgotPasswordOtp(otpData) {
    try {
      const result = await this.userContext.verifyForgotPasswordOtp(otpData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đặt lại mật khẩu
  async resetPassword(passwordData) {
    try {
      const result = await this.userContext.resetPassword(passwordData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(passwordData) {
    try {
      const result = await this.userContext.changePassword(passwordData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng xuất
  logout() {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('isAuthenticated');
    window.location.href = 'login.html';
  }

  // Kiểm tra trạng thái đăng nhập
  isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  // Lấy thông tin user
  getCurrentUser() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }
}

// Export cho sử dụng
window.AuthService = AuthService;
