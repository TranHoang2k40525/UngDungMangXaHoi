// API Base URL
const API_BASE_URL = 'http://10.68.31.105:5297';

// Hàm helper để gọi API
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API object
const authAPI = {
  // Register
  async register(adminData) {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  // Verify OTP
  async verifyOtp(data) {
    const result = await apiCall('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Lưu token vào localStorage sau khi verify thành công
    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Login
  async login(credentials) {
    const result = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Lưu token
    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Helper để lấy token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('Không có refresh token');
    }

    const result = await apiCall('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });

    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Logout
  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiCall('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ RefreshToken: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('adminInfo');
  },

  // Quên mật khẩu
  async forgotPassword(email) {
    return apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ Email: email }),
    });
  },

  // Xác thực OTP quên mật khẩu
  async verifyForgotPasswordOtp(data) {
    return apiCall('/api/auth/verify-forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset mật khẩu
  async resetPassword(data) {
    return apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Đổi mật khẩu
  async changePassword(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Xác thực OTP đổi mật khẩu
  async verifyChangePasswordOtp(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/auth/verify-change-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Kiểm tra authentication
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }
};

// Export
export { authAPI };
