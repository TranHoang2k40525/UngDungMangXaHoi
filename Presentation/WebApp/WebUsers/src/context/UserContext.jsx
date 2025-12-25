import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login,
  register,
  verifyOtp,
  logout,
  refreshToken,
  isAuthenticated as checkAuth,
  getProfile,
  restoreSession,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  changePassword,
} from '../Api/Api';

const UserContext = createContext(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

function getStoredUser() {
  try {
    const json = localStorage.getItem('userInfo');
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const hasToken = checkAuth();
      if (hasToken) {
        try {
          const restored = await restoreSession();
          if (restored.ok && restored.profile) {
            setUser(restored.profile);
            setIsAuthenticated(true);
          } else {
            await handleLogout();
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          await handleLogout();
        }
      }
    } catch (error) {
      console.error('Auth init error:', error);
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
          localStorage.setItem('userInfo', JSON.stringify(profile));
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
          localStorage.setItem('userInfo', JSON.stringify(profile));
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {}
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
      } catch (e) {
        console.error('localStorage clear error:', e);
      }
    }
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
    localStorage.setItem('userInfo', JSON.stringify({ ...user, ...updatedData }));
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    register: handleRegister,
    verifyOtp: handleVerifyOtp,
    login: handleLogin,
    logout: handleLogout,
    updateUser,
    refreshUser: initializeAuth,
    forgotPassword,
    verifyForgotPasswordOtp,
    resetPassword,
    changePassword,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
