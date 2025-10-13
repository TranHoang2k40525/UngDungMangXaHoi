import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  login, 
  register, 
  verifyOtp, 
  logout, 
  refreshToken, 
  isAuthenticated as checkAuth,
  setupTokenRefresh 
} from '../API/Api';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Khởi tạo user context
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Kiểm tra xem có token không
      const hasToken = await checkAuth();
      console.log('Has token:', hasToken);
      
      if (hasToken) {
        // Có token, thử refresh để lấy thông tin user mới nhất
        try {
          await refreshToken();
          // Lấy thông tin user từ token (có thể decode JWT hoặc gọi API)
          const userInfo = await AsyncStorage.getItem('userInfo');
          if (userInfo) {
            setUser(JSON.parse(userInfo));
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          await handleLogout();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // Nếu có lỗi, đảm bảo user được logout
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký
  const handleRegister = async (userData) => {
    try {
      const result = await register(userData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Xác thực OTP
  const handleVerifyOtp = async (otpData) => {
    try {
      const result = await verifyOtp(otpData);
      
      // Lưu thông tin user
      const userInfo = {
        email: otpData.Email,
        accountType: 'User',
        // Có thể thêm thông tin khác từ result
      };
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      setUser(userInfo);
      setIsAuthenticated(true);
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Đăng nhập
  const handleLogin = async (credentials) => {
    try {
      const result = await login(credentials);
      
      // Lưu thông tin user (có thể decode từ JWT hoặc gọi API)
      const userInfo = {
        email: credentials.Email || credentials.Phone,
        accountType: 'User',
        // Có thể thêm thông tin khác từ result
      };
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      setUser(userInfo);
      setIsAuthenticated(true);
      
      // Setup auto refresh token
      setupTokenRefresh();
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Đăng xuất
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Vẫn clear local state ngay cả khi API call fail
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };

  // Refresh token
  const handleRefreshToken = async () => {
    try {
      const result = await refreshToken();
      return { success: true, data: result };
    } catch (error) {
      // Token refresh failed, logout user
      await handleLogout();
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    verifyOtp: handleVerifyOtp,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
