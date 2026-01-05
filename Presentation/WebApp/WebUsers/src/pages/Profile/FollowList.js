import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFollowers, getFollowing, API_BASE_URL } from '../../api/Api';
import { MdGroup, MdPerson, MdArrowBack } from 'react-icons/md';
import './FollowList.css';

export default function FollowList() {
  const { type, userId } = useParams(); // type: 'followers' or 'following'
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  // Debug: Log URL and params on mount
  useEffect(() => {
    console.log('[FollowList] Component mounted');
    console.log('[FollowList] window.location.pathname:', window.location.pathname);
    console.log('[FollowList] useParams() type:', type);
    console.log('[FollowList] useParams() userId:', userId);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    console.log('[FollowList] Loading users - type:', type, 'userId:', userId);
    try {
      const data = type === 'followers' 
        ? await getFollowers(userId)
        : await getFollowing(userId);
      console.log('[FollowList] Received data for type', type, ':', data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Load follow list error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    navigate(`/user/${user.userId || user.UserId}`);
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
          <MdArrowBack size={24} />
        </button>
        <h1 className="follow-list-title">
          {type === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}
        </h1>
      </div>

      <div className="follow-list-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Đang tải...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <MdGroup className="empty-icon" />
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
                        <MdPerson className="icon-person" />
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
