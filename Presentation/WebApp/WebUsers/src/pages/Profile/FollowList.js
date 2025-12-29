import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFollowers, getFollowing, followUser, unfollowUser, API_BASE_URL } from '../../api/Api';
import './FollowList.css';

export default function FollowList() {
  const { userId, type } = useParams(); // type: 'followers' or 'following'
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    loadUsers();
  }, [userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = type === 'followers' 
        ? await getFollowers(userId)
        : await getFollowing(userId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Load follow list error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (user) => {
    try {
      if (user.isFollowing) {
        await unfollowUser(user.userId || user.UserId);
        setUsers(prev => prev.map(u => 
          (u.userId || u.UserId) === (user.userId || user.UserId)
            ? { ...u, isFollowing: false }
            : u
        ));
      } else {
        await followUser(user.userId || user.UserId);
        setUsers(prev => prev.map(u => 
          (u.userId || u.UserId) === (user.userId || user.UserId)
            ? { ...u, isFollowing: true }
            : u
        ));
      }
    } catch (e) {
      console.warn('Follow toggle error', e);
      alert('Không thể thực hiện thao tác');
    }
  };

  const handleUserClick = (user) => {
    navigate(`/profile/${user.userId || user.UserId}`);
  };

  const getAvatarUri = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `${API_BASE_URL}${avatarUrl}`;
  };

  return (
    <div className="follow-list-container">
      <div className="follow-list-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="follow-list-title">
          {type === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}
        </h1>
        <div className="header-spacer"></div>
      </div>

      <div className="follow-list-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Đang tải...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p className="empty-text">
              {type === 'followers' 
                ? 'Chưa có người theo dõi'
                : 'Chưa theo dõi ai'}
            </p>
          </div>
        ) : (
          <div className="users-list">
            {users.map((user) => {
              const avatarUri = getAvatarUri(user.avatarUrl || user.AvatarUrl);
              const uid = user.userId || user.UserId;
              
              return (
                <div key={uid} className="user-item">
                  <div className="user-info" onClick={() => handleUserClick(user)}>
                    {avatarUri ? (
                      <img src={avatarUri} alt="Avatar" className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        <span className="icon-person">👤</span>
                      </div>
                    )}
                    <div className="user-details">
                      <div className="user-fullname">
                        {user.fullName || user.FullName || 'Người dùng'}
                      </div>
                      <div className="user-username">
                        @{user.username || user.Username || user.userName || user.UserName || 'unknown'}
                      </div>
                      {user.bio && (
                        <div className="user-bio">{user.bio}</div>
                      )}
                    </div>
                  </div>
                  
                  {!user.isCurrentUser && (
                    <button
                      className={`follow-button ${user.isFollowing ? 'following' : ''}`}
                      onClick={() => handleFollowToggle(user)}
                    >
                      {user.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
