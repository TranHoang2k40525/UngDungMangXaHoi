import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
export const API_BASE_URL = 'http://192.168.1.101:5297'; // Thay bằng IP thực tế, ví dụ: 'http://192.168.1.100:5000'

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

// Register
export const register = async (userData) => {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Verify OTP
export const verifyOtp = async (data) => {
  const result = await apiCall('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Lưu token vào AsyncStorage sau khi verify thành công
  if (result.AccessToken && result.RefreshToken) {
    await AsyncStorage.setItem('accessToken', result.AccessToken);
    await AsyncStorage.setItem('refreshToken', result.RefreshToken);
  }

  return result;
};

// Login
export const login = async (credentials) => {
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // Lưu token
  if (result.AccessToken && result.RefreshToken) {
    await AsyncStorage.setItem('accessToken', result.AccessToken);
    await AsyncStorage.setItem('refreshToken', result.RefreshToken);
  }

  return result;
};

// Helper để lấy token (dùng cho các API authenticated sau này)
export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Refresh token
export const refreshToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Không có refresh token');
  }

  const result = await apiCall('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ RefreshToken: refreshToken }),
  });

  if (result.AccessToken && result.RefreshToken) {
    await AsyncStorage.setItem('accessToken', result.AccessToken);
    await AsyncStorage.setItem('refreshToken', result.RefreshToken);
  }

  return result;
};

// Logout
export const logout = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
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
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userInfo']);
};

// Quên mật khẩu
export const forgotPassword = async (email) => {
  return apiCall('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ Email: email }),
  });
};

// Xác thực OTP quên mật khẩu
export const verifyForgotPasswordOtp = async (data) => {
  return apiCall('/api/auth/verify-forgot-password-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Reset mật khẩu
export const resetPassword = async (data) => {
  return apiCall('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Đổi mật khẩu
export const changePassword = async (data) => {
  const headers = await getAuthHeaders();
  return apiCall('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  });
};

// Xác thực OTP đổi mật khẩu
export const verifyChangePasswordOtp = async (data) => {
  const headers = await getAuthHeaders();
  return apiCall('/api/auth/verify-change-password-otp', {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  });
};

// Helper functions
export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  return !!token;
};

// Auto refresh token khi token hết hạn
export const setupTokenRefresh = () => {
  // Kiểm tra token mỗi 5 phút
  setInterval(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await refreshToken();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, 5 * 60 * 1000); // 5 phút
};