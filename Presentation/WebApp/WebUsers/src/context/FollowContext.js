import React, { createContext, useContext, useState, useCallback } from 'react';

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  const [followedUsers, setFollowedUsers] = useState({});

  const markAsFollowed = useCallback((userId) => {
    setFollowedUsers(prev => ({ ...prev, [userId]: true }));
  }, []);

  const markAsUnfollowed = useCallback((userId) => {
    setFollowedUsers(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  }, []);

  const isFollowed = useCallback((userId) => {
    return followedUsers[userId] === true;
  }, [followedUsers]);

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
