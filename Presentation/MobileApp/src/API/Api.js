import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
export const API_BASE_URL = 'http://192.168.100.184:5297'; // Backend đang chạy trên IP này

// Hàm helper để gọi API
const apiCall = async (endpoint, options = {}) => {
  try {
    console.log(`[API-CALL] Making API call to: ${API_BASE_URL}${endpoint}`);
    console.log(`[API-CALL] Options:`, JSON.stringify(options, null, 2));
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: 10000, // 10 seconds timeout
    });

    console.log(`[API-CALL] Response status: ${response.status}`);

    // Đọc response text trước
    const responseText = await response.text();
    console.log(`[API-CALL] Response text:`, responseText);

    // Parse JSON nếu có content
    let result = null;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('[API-CALL] Could not parse response as JSON:', parseError);
        // Nếu không parse được JSON, throw error
        throw new Error('Server trả về dữ liệu không hợp lệ');
      }
    }

    if (!response.ok) {
      // Xử lý error response
      let errorMessage = result?.message || result?.Message || `HTTP error! status: ${response.status}`;
      console.error('[API-CALL] Error:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('[API-CALL] API call successful');
    return result;
  } catch (error) {
    console.error('[API-CALL] API Error:', error);
    
    // Xử lý các loại lỗi khác nhau
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } else if (error.name === 'AbortError') {
      throw new Error('Yêu cầu bị hủy do timeout.');
    } else {
      throw error;
    }
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
  if (result?.AccessToken && result?.RefreshToken) {
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
  if (result?.AccessToken && result?.RefreshToken) {
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

  if (result?.AccessToken && result?.RefreshToken) {
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
  console.log('[FORGOT-PASSWORD] Calling API with email:', email);
  return apiCall('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ Email: email }),
  });
};

// Xác thực OTP quên mật khẩu
export const verifyForgotPasswordOtp = async (data) => {
  console.log('[VERIFY-FORGOT-PASSWORD-OTP] Calling API with data:', data);
  return apiCall('/api/auth/verify-forgot-password-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Reset mật khẩu
export const resetPassword = async (data) => {
  console.log('[RESET-PASSWORD] Calling API with data:', { Email: data.Email, NewPassword: '***' });
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
  try {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Auto refresh token khi token hết hạn
export const setupTokenRefresh = () => {
  // Kiểm tra token mỗi 5 phút
  setInterval(async () => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      if (refreshTokenValue) {
        await refreshToken();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, 5 * 60 * 1000); // 5 phút
};
