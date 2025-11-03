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
      const res = await fetch(`${this.baseUrl()}/api/auth/register`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(userData)
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đăng nhập
  async login(credentials) {
    try {
      const payload = { ...credentials };
      if (!payload.Email && payload.identifier) {
        if (payload.identifier.includes('@')) payload.Email = payload.identifier; else payload.Phone = payload.identifier;
      }
      delete payload.identifier;
      const res = await fetch(`${this.baseUrl()}/api/auth/login`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(payload)
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

      // Hỗ trợ tên trường khác nhau
      const access = json?.AccessToken || json?.accessToken || json?.data?.accessToken;
      const refresh = json?.RefreshToken || json?.refreshToken || json?.data?.refreshToken;
      if (access && refresh) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        // Lấy profile để lưu userInfo
        const profile = await this.getProfileSafe();
        if (profile) localStorage.setItem('userInfo', JSON.stringify(profile));
        this.user = profile || null;
        this.isAuthenticated = true;
        this.notifyListeners();
      }
      return { success: true, data: { accessToken: access, refreshToken: refresh, user: this.user } };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP
  async verifyOtp(otpData) {
    try {
      const res = await fetch(`${this.baseUrl()}/api/auth/verify-otp`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(otpData)
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      const access = json?.AccessToken || json?.accessToken || json?.data?.accessToken;
      const refresh = json?.RefreshToken || json?.refreshToken || json?.data?.refreshToken;
      if (access && refresh) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        const profile = await this.getProfileSafe();
        if (profile) localStorage.setItem('userInfo', JSON.stringify(profile));
        this.user = profile || null;
        this.isAuthenticated = true;
        this.notifyListeners();
      }
      return { success: true, data: { accessToken: access, refreshToken: refresh, user: this.user } };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Quên mật khẩu
  async forgotPassword(email) {
    try {
      const res = await fetch(`${this.baseUrl()}/api/auth/forgot-password`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify({ Email: email })
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP quên mật khẩu
  async verifyForgotPasswordOtp(otpData) {
    try {
      const res = await fetch(`${this.baseUrl()}/api/auth/verify-forgot-password-otp`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(otpData)
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error) {
      console.error('Verify forgot password OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đặt lại mật khẩu
  async resetPassword(passwordData) {
    try {
      const res = await fetch(`${this.baseUrl()}/api/auth/reset-password`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(passwordData)
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đổi mật khẩu
  async changePassword(passwordData) {
    try {
      const res = await this.authedFetch('/api/auth/change-password', {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(passwordData)
      });
      return { success: true, data: res };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify OTP đổi mật khẩu
  async verifyChangePasswordOtp(otpData) {
    try {
      const res = await this.authedFetch('/api/auth/verify-change-password-otp', {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify(otpData)
      });
      return { success: true, data: res };
    } catch (error) {
      console.error('Verify change password OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');
      const res = await fetch(`${this.baseUrl()}/api/auth/refresh`, {
        method: 'POST', headers: this.jsonHeaders(), body: JSON.stringify({ RefreshToken: refreshToken })
      });
      const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) throw new Error(json?.message || 'Token refresh failed');
      const access = json?.AccessToken || json?.accessToken;
      const refresh = json?.RefreshToken || json?.refreshToken;
      if (access && refresh) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        return { success: true, data: { accessToken: access, refreshToken: refresh } };
      }
      throw new Error('Token refresh failed');
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
      const res = await fetch(`${this.baseUrl()}/api/auth/validate-token`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      return res.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Helpers
  baseUrl() {
    // Cho phép override bằng window.API_BASE_URL nếu đã include file cấu hình
    return window.API_BASE_URL || 'http://10.68.31.105:5297';
  }
  jsonHeaders() { return { 'Content-Type': 'application/json', 'Accept': 'application/json' }; }
  authHeader() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  async authedFetch(endpoint, options = {}) {
    const doFetch = async (opts) => fetch(`${this.baseUrl()}${endpoint}`, {
      ...opts,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(opts.headers||{}), ...this.authHeader() }
    });
    const res = await doFetch(options);
    if (res.status === 401 && !options._retry) {
      const rf = await this.refreshToken();
      if (rf?.success) {
        return doFetch({ ...options, _retry: true });
      }
    }
    const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null } catch {}
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  }
  async getProfileSafe() {
    try {
      const json = await this.authedFetch('/api/users/profile', { method: 'GET' });
      return json?.data || null;
    } catch { return null; }
  }
}

// Tạo instance global
window.UserContext = UserContext;