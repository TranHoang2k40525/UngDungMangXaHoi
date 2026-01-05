import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFollowing, createGroup } from '../../api/Api';
import { MdGroup, MdSearch, MdPerson, MdCheck, MdClose } from 'react-icons/md';
import './CreateGroupScreen.css';

export default function CreateGroupScreen() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allFollowing, setAllFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      
      // Get user ID from localStorage
      let userId = null;
      
      const userStr = localStorage.getItem('userInfo');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.user_id || user.userId || user.id;
        } catch (e) {
          console.log('Parse user error:', e);
        }
      }
      
      if (!userId) {
        alert('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        navigate(-1);
        return;
      }
      
      const followingData = await getFollowing(userId);
      setAllFollowing(followingData || []);
    } catch (error) {
      console.error('Load following error:', error);
      alert('Không thể tải danh sách bạn bè: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allFollowing.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName = (user.fullName || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const toggleMember = (user) => {
    const userId = user.userId || user.user_id;
    const isSelected = selectedMembers.some(m => (m.userId || m.user_id) === userId);
    
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => (m.userId || m.user_id) !== userId));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    try {
      setCreating(true);
      
      const memberIds = selectedMembers.map(m => m.userId || m.user_id);
      
      console.log('Creating group with:', {
        name: groupName,
        memberIds,
        invitePermission: 'all',
      });
      
      const response = await createGroup(
        groupName.trim(),
        memberIds,
        'all',
        null
      );
      
      console.log('Create group response:', response);
      
      if (response.success && response.conversation) {
        alert(`Đã tạo nhóm "${groupName}" thành công!`);
        navigate(`/messenger/group/${response.conversation.conversationId}`, {
          state: { groupName: response.conversation.name }
        });
      } else {
        throw new Error(response.message || 'Tạo nhóm thất bại');
      }
    } catch (error) {
      console.error('Create group error:', error);
      alert(error.message || 'Không thể tạo nhóm. Vui lòng thử lại sau.');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = (item) => {
    const userId = item.userId || item.user_id;
    const isSelected = selectedMembers.some(m => (m.userId || m.user_id) === userId);
    
    const getAvatarUrl = () => {
      const avatarUrl = item.avatarUrl || item.avatar_url;
      if (!avatarUrl) return null;
      
      if (avatarUrl.startsWith('http')) {
        return avatarUrl;
      }
      
      const apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';
      return `${apiUrl}${avatarUrl}`;
    };

    const avatarUrl = getAvatarUrl();

    return (
      <div 
        key={userId}
        className="create-group-user-item"
        onClick={() => toggleMember(item)}
      >
        <div className="create-group-user-left">
          {avatarUrl ? (
            <img src={avatarUrl} alt={item.fullName} className="create-group-avatar" />
          ) : (
            <div className="create-group-avatar-placeholder">
              <MdPerson size={24} color="#FFFFFF" />
            </div>
          )}
          <div className="create-group-user-info">
            <p className="create-group-user-name">{item.fullName || item.full_name || 'User'}</p>
            <p className="create-group-user-username">@{item.username || 'username'}</p>
          </div>
        </div>
        
        <div className={`create-group-checkbox ${isSelected ? 'selected' : ''}`}>
          {isSelected && <MdCheck size={18} color="#FFFFFF" />}
        </div>
      </div>
    );
  };

  const renderSelectedMember = (member) => {
    const userId = member.userId || member.user_id;
    return (
      <div key={userId} className="create-group-selected-chip">
        <span className="create-group-selected-chip-text">{member.fullName}</span>
        <button 
          onClick={() => toggleMember(member)}
          className="create-group-remove-chip"
        >
          <MdClose size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="create-group-container">
      {/* Header */}
      <div className="create-group-header">
        <button 
          className="create-group-back-button"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h2 className="create-group-header-title">Tạo nhóm mới</h2>
        <button 
          className={`create-group-create-button ${creating ? 'disabled' : ''}`}
          onClick={handleCreateGroup}
          disabled={creating}
        >
          {creating ? <div className="create-group-spinner" /> : 'Tạo'}
        </button>
      </div>

      {/* Group Name Input */}
      <div className="create-group-name-section">
        <div className="create-group-input-container">
          <MdGroup className="icon-people" />
          <input
            type="text"
            className="create-group-input"
            placeholder="Tên nhóm"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={50}
          />
        </div>
      </div>

      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <div className="create-group-selected-section">
          <p className="create-group-selected-title">
            Đã chọn ({selectedMembers.length})
          </p>
          <div className="create-group-selected-list">
            {selectedMembers.map(member => renderSelectedMember(member))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="create-group-search-container">
        <MdSearch className="icon-search" />
        <input
          type="text"
          className="create-group-search-input"
          placeholder="Tìm kiếm người theo dõi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.length > 0 && (
          <button onClick={() => setSearchQuery('')} className="create-group-clear-button">
            <MdClose size={20} />
          </button>
        )}
      </div>

      {/* User List */}
      {loading ? (
        <div className="create-group-loading">
          <div className="create-group-spinner-large" />
        </div>
      ) : (
        <div className="create-group-list">
          {filteredUsers.map(user => renderUserItem(user))}
        </div>
      )}
    </div>
  );
}
