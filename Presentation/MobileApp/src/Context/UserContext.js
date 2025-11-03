import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login,
  register,
  verifyOtp,
  logout,
  refreshToken,
  isAuthenticated as checkAuth,
  setupTokenRefresh,
  getProfile,
  restoreSession,
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

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const hasToken = await checkAuth();
      if (hasToken) {
        const restored = await restoreSession();
        if (restored.ok && restored.profile) {
          setUser(restored.profile);
          setIsAuthenticated(true);
        } else {
          await handleLogout();
        }
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (userData) => {
    try {
      const result = await register(userData);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleVerifyOtp = async (otpData) => {
    try {
      const result = await verifyOtp(otpData);
      try {
        const profile = await getProfile();
        if (profile) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(profile));
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {}
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const result = await login(credentials);
      try {
        const profile = await getProfile();
        if (profile) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(profile));
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {}
      setupTokenRefresh();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };

  const handleRefreshToken = async () => {
    try {
      const result = await refreshToken();
      return { success: true, data: result };
    } catch (error) {
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
