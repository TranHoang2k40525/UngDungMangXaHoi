// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
export const API_BASE_URL = 'http://localhost:5297';

// Hàm helper để lưu/đọc token từ localStorage
const getStoredToken = () => {
  return localStorage.getItem('adminAccessToken');
};

const getStoredRefreshToken = () => {
  return localStorage.getItem('adminRefreshToken');
};

const setStoredTokens = (accessToken, refreshToken) => {
  localStorage.setItem('adminAccessToken', accessToken);
  localStorage.setItem('adminRefreshToken', refreshToken);
};

const clearStoredTokens = () => {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminInfo');
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
  // Đăng ký admin
  register: async (adminData) => {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(adminData),
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

  // Đăng nhập admin
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

// Admin APIs
export const adminAPI = {
  // Lấy thông tin admin hiện tại
  getCurrentAdmin: async () => {
    return authenticatedApiCall('/api/admin/profile');
  },

  // Cập nhật profile admin
  updateProfile: async (data) => {
    return authenticatedApiCall('/api/admin/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Quản lý users
  getAllUsers: async () => {
    return authenticatedApiCall('/api/admin/users');
  },

  // Quản lý reports
  getAllReports: async () => {
    return authenticatedApiCall('/api/admin/reports');
  },

  // Moderation
  moderateContent: async (data) => {
    return authenticatedApiCall('/api/admin/moderate', {
      method: 'POST',
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
      window.location.href = '/pages/auth/login.html';
    }
  }, 5 * 60 * 1000); // 5 phút
};
