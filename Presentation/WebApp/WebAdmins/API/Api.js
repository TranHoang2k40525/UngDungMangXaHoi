// API Base URL
const API_BASE_URL = 'http://localhost:5297';

// Hàm helper để gọi API
const apiCall = async (endpoint, options = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`); // Debug
    console.log('[API] Headers:', headers); // Debug
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[API] Error status:', response.status);
      console.error('[API] Error body (raw):', text);
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { message: text || 'Network error' };
      }
      console.error('[API] Error response:', errorData);
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
  // Register Admin (chỉ email đã tồn tại trong SQL mới được đăng ký)
  async registerAdmin(adminData) {
    return apiCall('/api/auth/register-admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  // Verify OTP cho Admin
  async verifyAdminOtp(data) {
    const result = await apiCall('/api/auth/verify-admin-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Lưu token vào localStorage sau khi verify thành công (support cả camelCase và PascalCase)
    if (result.accessToken && result.refreshToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
    } else if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Register User (giữ lại để tương thích)
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

    // Lưu token vào localStorage sau khi verify thành công (support cả camelCase và PascalCase)
    if (result.accessToken && result.refreshToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
    } else if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Login (hỗ trợ cả User và Admin)
  async login(credentials) {
    const result = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    console.log('[Auth] Login response:', result); // Debug

    // Lưu token (backend trả về lowercase: accessToken, refreshToken)
    if (result.accessToken && result.refreshToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      console.log('[Auth] Token saved (camelCase):', result.accessToken.substring(0, 30) + '...'); // Debug
    } else if (result.AccessToken && result.RefreshToken) {
      // Fallback cho PascalCase (nếu backend thay đổi)
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
      console.log('[Auth] Token saved (PascalCase):', result.AccessToken.substring(0, 30) + '...'); // Debug
    } else {
      console.error('[Auth] No token in response!', result);
      throw new Error('Backend không trả về token');
    }

    // Verify token đã được lưu
    const savedToken = localStorage.getItem('accessToken');
    console.log('[Auth] Verify saved token:', savedToken ? 'OK' : 'FAILED');

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

// Admin API object
const adminAPI = {
  // Helper để lấy token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Lấy thông tin profile Admin
  async getProfile() {
    const headers = this.getAuthHeaders();
    return apiCall('/api/admin/profile', {
      method: 'GET',
      headers,
    });
  },

  // Cập nhật thông tin profile Admin (không cho phép sửa email)
  async updateProfile(profileData) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/admin/update-profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
      headers,
    });
  },

  // Đổi mật khẩu Admin
  async changePassword(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Xác thực OTP đổi mật khẩu Admin
  async verifyChangePasswordOtp(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/admin/verify-change-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Đổi mật khẩu trực tiếp (không cần OTP)
  async changePasswordDirect(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/auth/change-password-direct', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }
};

// Export
export { authAPI, adminAPI };
