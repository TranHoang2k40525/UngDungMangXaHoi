import React, { createContext, useContext, useState, useCallback } from 'react';

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  // State lưu trạng thái follow: { [userId]: true/false }
  const [followedUsers, setFollowedUsers] = useState({});

  // Đánh dấu user đã follow
  const markAsFollowed = useCallback((userId) => {
    setFollowedUsers(prev => ({ ...prev, [userId]: true }));
  }, []);

  // Đánh dấu user đã unfollow
  const markAsUnfollowed = useCallback((userId) => {
    setFollowedUsers(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  }, []);

  // Kiểm tra xem user đã follow chưa
  const isFollowed = useCallback((userId) => {
    return followedUsers[userId] === true;
  }, [followedUsers]);

  // Reset tất cả trạng thái (dùng khi logout hoặc cần refresh)
  const resetFollowState = useCallback(() => {
    setFollowedUsers({});
  }, []);

  const value = {
    followedUsers,
    markAsFollowed,
    markAsUnfollowed,
    isFollowed,
    resetFollowState,
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};
