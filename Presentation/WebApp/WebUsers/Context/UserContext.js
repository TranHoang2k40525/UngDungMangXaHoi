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
      const response = await fetch('http://10.68.31.105:5297/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đăng nhập
  async login(credentials) {
    try {
      // Xác định email hoặc phone
      const requestData = {
        Email: credentials.Email || credentials.identifier || '',
        Phone: credentials.Phone || (!credentials.Email && !credentials.identifier?.includes('@') ? credentials.identifier : ''),
        Password: credentials.Password || credentials.password
      };

      // Loại bỏ các field rỗng
      if (!requestData.Email) delete requestData.Email;
      if (!requestData.Phone) delete requestData.Phone;

      const response = await fetch('http://10.68.31.105:5297/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Lưu token và user info
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        localStorage.setItem('userInfo', JSON.stringify(result.data.user));
        
        this.user = result.data.user;
        this.isAuthenticated = true;
        this.notifyListeners();
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOtp(otpData) {
    try {
      const response = await fetch('http://10.68.31.105:5297/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(otpData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Lưu token và user info
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        localStorage.setItem('userInfo', JSON.stringify(result.data.user));
        
        this.user = result.data.user;
        this.isAuthenticated = true;
        this.notifyListeners();
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Quên mật khẩu
  async forgotPassword(email) {
    try {
      const response = await fetch('http://10.68.31.105:5297/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ Email: email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP quên mật khẩu
  async verifyForgotPasswordOtp(otpData) {
    try {
      const response = await fetch('http://10.68.31.105:5297/api/auth/verify-forgot-password-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(otpData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Verify forgot password OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đặt lại mật khẩu
  async resetPassword(passwordData) {
    try {
      const response = await fetch('http://10.68.31.105:5297/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(passwordData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Bạn cần đăng nhập để đổi mật khẩu');
      }

      const response = await fetch('http://10.68.31.105:5297/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP đổi mật khẩu
  async verifyChangePasswordOtp(otpData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Bạn cần đăng nhập để đổi mật khẩu');
      }

      const response = await fetch('http://10.68.31.105:5297/api/auth/verify-change-password-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(otpData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Verify change password OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('http://10.68.31.105:5297/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ RefreshToken: refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        return { success: true, data: result.data };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      this.logout();
      return { success: false, error: error.message };
    }
  }

  // Đăng xuất
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    this.user = null;
    this.isAuthenticated = false;
    this.notifyListeners();
  }

  // Setup token refresh
  setupTokenRefresh() {
    // Refresh token mỗi 50 phút
    setInterval(async () => {
      if (this.isAuthenticated) {
        await this.refreshToken();
      }
    }, 50 * 60 * 1000);
  }

  // Kiểm tra token có hợp lệ không
  async isTokenValid() {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const response = await fetch('http://10.68.31.105:5297/api/auth/validate-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

// Tạo instance global
window.UserContext = UserContext;