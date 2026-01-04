import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './InviteMemberScreen.css';
import { getFollowing, inviteToGroup, getProfile, API_BASE_URL } from '../../api/Api';
import { MdClose, MdGroup } from 'react-icons/md';

export default function InviteMemberScreen() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();
  const { groupName, currentMembers = [], currentUserId: navCurrentUserId = null } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFollowing, setAllFollowing] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [invitingUserId, setInvitingUserId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadFollowing();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, allFollowing]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      
      // Lấy current user ID
      let userId = null;

      // 1) Try route param (passed from GroupDetail)
      if (navCurrentUserId) {
        userId = navCurrentUserId;
      }

      // 2) Try localStorage 'user'
      if (!userId) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.user_id || user.userId || null;
          } catch { userId = null; }
        }
      }

      // 3) Try localStorage 'userInfo'
      if (!userId) {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          try {
            const ui = JSON.parse(userInfoStr);
            userId = ui.user_id || ui.userId || ui.id || null;
          } catch { userId = null; }
        }
      }

      // 4) Try API getProfile using stored access token
      if (!userId) {
        try {
          const profile = await getProfile();
          if (profile) {
            userId = profile.user_id || profile.userId || profile.id || null;
          }
        } catch (e) {
          // ignore - we'll handle missing user below
        }
      }

      if (!userId) {
        // Could not resolve user id - allow opening screen but show empty list
        console.warn('[InviteMember] No current user id available; showing empty list');
        setCurrentUserId(null);
        setAllFollowing([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(userId);

      // Lấy danh sách đang theo dõi
      const followingData = await getFollowing(userId);
      
      // Lọc bỏ những người đã là thành viên
      const currentMemberIds = currentMembers.map(m => m.userId);
      const availableUsers = followingData.filter(
        user => !currentMemberIds.includes(user.userId || user.user_id)
      );

      setAllFollowing(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (error) {
      console.error('Load following error:', error);
      alert(`Lỗi: ${error.message || 'Không thể tải danh sách người theo dõi'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allFollowing);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allFollowing.filter(user => {
      const fullName = (user.fullName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      return fullName.includes(query) || username.includes(query);
    });

    setFilteredUsers(filtered);
  };

  const handleInviteUser = async (user) => {
    try {
      setInvitingUserId(user.userId || user.user_id);

      // Xác nhận mời
      const confirmed = window.confirm(
        `Bạn có chắc muốn mời ${user.fullName} vào nhóm "${groupName}"?`
      );

      if (!confirmed) {
        setInvitingUserId(null);
        return;
      }

      try {
        await inviteToGroup(conversationId, user.userId || user.user_id);
        
        // Thành công
        alert(`Đã mời ${user.fullName} vào nhóm`);
        // Quay lại màn hình chi tiết nhóm và refresh
        navigate(`/messenger/group/${conversationId}`, { replace: true });
      } catch (error) {
        console.error('Invite error:', error);
        
        // Parse error message
        let errorMessage = 'Không thể mời thành viên';
        if (error.message) {
          if (error.message.includes('not follow each other')) {
            errorMessage = 'Hai bạn chưa theo dõi lẫn nhau';
          } else if (error.message.includes('blocked')) {
            errorMessage = 'Không thể mời do bị chặn';
          } else if (error.message.includes('message restriction')) {
            errorMessage = 'Người dùng đã hạn chế nhận tin nhắn';
          } else if (error.message.includes('maximum capacity')) {
            errorMessage = 'Nhóm đã đạt giới hạn thành viên';
          } else if (error.message.includes('already a member')) {
            errorMessage = 'Người dùng đã là thành viên của nhóm';
          } else if (error.message.includes('permission')) {
            errorMessage = 'Bạn không có quyền mời thành viên';
          } else {
            errorMessage = error.message;
          }
        }

        alert(`Không thể mời: ${errorMessage}`);
      } finally {
        setInvitingUserId(null);
      }
    } catch (error) {
      console.error('Invite preparation error:', error);
      setInvitingUserId(null);
    }
  };

  const getAvatarUri = (user) => {
    const avatar = user.avatarUrl || user.avatar_url || user.avatar || user.imageUrl || user.avatarUrlFull;
    if (!avatar) return null;
    return avatar.startsWith('http') || avatar.startsWith('file://') || avatar.startsWith('blob:')
      ? avatar
      : `${API_BASE_URL}${avatar}`;
  };

  const renderUserItem = (item) => {
    const isInviting = invitingUserId === (item.userId || item.user_id);
    const avatarUri = getAvatarUri(item);

    return (
      <div 
        key={item.userId || item.user_id} 
        className="user-item"
      >
        <div className="user-avatar">
          {avatarUri ? (
            <img src={avatarUri} alt={item.fullName} className="avatar-image" />
          ) : (
            <div className="default-avatar">
              <span className="avatar-text">
                {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
        
        <div className="user-info">
          <div className="user-name">{item.fullName}</div>
          <div className="user-username">@{item.username}</div>
        </div>
        
        {isInviting ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <button 
            className="invite-btn"
            onClick={() => handleInviteUser(item)}
          >
            <span className="invite-icon">👤+</span>
            <span className="invite-btn-text">Mời</span>
          </button>
        )}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="empty-container">
      <div className="empty-icon"><MdGroup size={48} /></div>
      <div className="empty-title">
        {searchQuery ? 'Không tìm thấy người dùng' : 'Không có người theo dõi'}
      </div>
      <div className="empty-subtitle">
        {searchQuery 
          ? 'Thử tìm kiếm với từ khóa khác' 
          : 'Bạn chưa theo dõi ai hoặc tất cả người theo dõi đã là thành viên'}
      </div>
    </div>
  );

  return (
    <div className="invite-member-container">
      <div className="invite-member-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <span className="back-icon"><MdArrowBack size={24} /></span>
        </button>
        <div className="header-center">
          <div className="header-title">Mời thành viên</div>
          <div className="header-subtitle">{groupName}</div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Tìm kiếm người theo dõi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {searchQuery.length > 0 && (
          <button 
            className="clear-button"
            onClick={() => setSearchQuery('')}
          >
            <span className="clear-icon"><MdClose size={20} /></span>
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <span className="info-icon">ℹ️</span>
        <span className="info-banner-text">
          Chỉ hiển thị người bạn đang theo dõi chưa là thành viên
        </span>
      </div>

      {/* User List */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner-large">
            <div className="spinner-large"></div>
          </div>
          <div className="loading-text">Đang tải...</div>
        </div>
      ) : (
        <div className="user-list">
          {filteredUsers.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredUsers.map(renderUserItem)
          )}
        </div>
      )}
    </div>
  );
}
