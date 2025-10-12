// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
export const API_BASE_URL = 'http://localhost:5297';

// Hàm helper để lưu/đọc token từ localStorage
const getStoredToken = () => {
  return localStorage.getItem('accessToken');
};

const getStoredRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

const setStoredTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

const clearStoredTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userInfo');
};

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
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Hàm helper để gọi API với authentication
const authenticatedApiCall = async (endpoint, options = {}) => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Chưa đăng nhập');
  }

  return apiCall(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

// Auth APIs
export const authAPI = {
  // Đăng ký
  register: async (userData) => {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Xác thực OTP
  verifyOtp: async (data) => {
    const result = await apiCall('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Lưu token vào localStorage sau khi verify thành công
    if (result.AccessToken && result.RefreshToken) {
      setStoredTokens(result.AccessToken, result.RefreshToken);
    }

    return result;
  },

  // Đăng nhập
  login: async (credentials) => {
    const result = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Lưu token
    if (result.AccessToken && result.RefreshToken) {
      setStoredTokens(result.AccessToken, result.RefreshToken);
    }

    return result;
  },

  // Refresh token
  refreshToken: async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('Không có refresh token');
    }

    const result = await apiCall('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });

    if (result.AccessToken && result.RefreshToken) {
      setStoredTokens(result.AccessToken, result.RefreshToken);
    }

    return result;
  },

  // Đăng xuất
  logout: async () => {
    const refreshToken = getStoredRefreshToken();
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
    clearStoredTokens();
  },

  // Quên mật khẩu
  forgotPassword: async (email) => {
    return apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ Email: email }),
    });
  },

  // Xác thực OTP quên mật khẩu
  verifyForgotPasswordOtp: async (data) => {
    return apiCall('/api/auth/verify-forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset mật khẩu
  resetPassword: async (data) => {
    return apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Đổi mật khẩu
  changePassword: async (data) => {
    return authenticatedApiCall('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Xác thực OTP đổi mật khẩu
  verifyChangePasswordOtp: async (data) => {
    return authenticatedApiCall('/api/auth/verify-change-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// User APIs
export const userAPI = {
  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    return authenticatedApiCall('/api/user/profile');
  },

  // Cập nhật profile
  updateProfile: async (data) => {
    return authenticatedApiCall('/api/user/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Helper functions
export const isAuthenticated = () => {
  return !!getStoredToken();
};

export const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auto refresh token khi token hết hạn
export const setupTokenRefresh = () => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return;

  // Kiểm tra token mỗi 5 phút
  setInterval(async () => {
    try {
      await authAPI.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearStoredTokens();
      // Redirect to login page
      window.location.href = '/login.html';
    }
  }, 5 * 60 * 1000); // 5 phút
};
