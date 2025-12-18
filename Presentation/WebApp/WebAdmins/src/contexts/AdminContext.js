import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminAPI } from '../services/api.js';

const AdminContext = createContext(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    avatarUrl: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    hometown: '',
    job: '',
    website: '',
    bio: '',
    isPrivate: false,
    adminLevel: '',
    loading: true
  });

  // Load admin profile on mount
  useEffect(() => {
    // Only attempt to load admin profile if an access token exists
    const token = localStorage.getItem('accessToken');
    if (token) loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      const response = await adminAPI.getProfile();
      if (response.success) {
        setAdminData(prev => ({
          ...prev,
          ...response.data,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Failed to load admin profile:', error);
      setAdminData(prev => ({ ...prev, loading: false }));
    }
  };

  const updateAdminData = (newData) => {
    console.log('[AdminContext] Updating admin data:', newData);
    setAdminData(prev => {
      const updated = {
        ...prev,
        ...newData
      };
      console.log('[AdminContext] New state:', updated);
      return updated;
    });
  };

  const refreshAdminProfile = async () => {
    await loadAdminProfile();
  };

  const value = {
    adminData,
    updateAdminData,
    refreshAdminProfile
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
