import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getGroupMembers, API_BASE_URL, getGroupInfo } from '../../api/Api';
import { MdArrowBack, MdClose, MdGroup, MdSearch, MdShield } from 'react-icons/md';
import './GroupMembersScreen.css';

export default function GroupMembersScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const groupName = location.state?.groupName || 'Group';

  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [groupCreatedBy, setGroupCreatedBy] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(
        (member) =>
          (member.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (member.fullName || member.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      // Get current user ID
      const userStr = localStorage.getItem('userInfo') || localStorage.getItem('user');
      let currentUser = null;
      if (userStr) {
        currentUser = JSON.parse(userStr);
        const userId = currentUser.user_id || currentUser.userId || currentUser.UserId || currentUser.id;
        setCurrentUserId(userId);
        console.log('Current user loaded:', { userId, username: currentUser.username });
      }

      // Load group info and members
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);

      setGroupCreatedBy(groupData?.createdBy || groupData?.created_by || null);
      console.log('Members loaded:', membersData.length);

      // Enhance members with avatar
      const enhancedMembers = membersData.map((member) => {
        let avatarUrl = member.avatar || member.avatarUrl;

        // If member is current user, use avatar from localStorage
        if (
          currentUser &&
          (member.userId === currentUser.userId ||
            member.userId === currentUser.user_id ||
            member.userId === currentUser.UserId ||
            member.userId === currentUser.id)
        ) {
          avatarUrl = avatarUrl || currentUser.avatar || currentUser.avatarUrl;
        }

        // Process URI: create full URL if needed
        if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('blob:')) {
          avatarUrl = `${API_BASE_URL}${avatarUrl}`;
        }

        return {
          ...member,
          avatar: avatarUrl,
          fullName: member.fullName || member.full_name || member.username,
        };
      });

      // Sort: Admins first, then by name
      const sortedMembers = enhancedMembers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.fullName || '').localeCompare(b.fullName || '');
      });

      setMembers(sortedMembers);
      setFilteredMembers(sortedMembers);

      // Determine current user's role
      if (currentUser) {
        const me = sortedMembers.find(
          (m) => Number(m.userId) === Number(currentUser.user_id || currentUser.userId || currentUser.id)
        );
        setCurrentUserRole(me?.role || null);
      }
    } catch (error) {
      console.error('Load members error:', error);
      alert('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberPress = (member) => {
    console.log('Member pressed:', member.userId, 'Current:', currentUserId);

    const isOwnProfile = Number(member.userId) === Number(currentUserId);

    if (isOwnProfile) {
      console.log('Own profile - navigating to /profile');
      navigate('/profile');
      return;
    }

    // If current user is admin, show action menu
    if (currentUserRole === 'admin') {
      setSelectedMember(member);
      setShowActionMenu(true);
      return;
    }

    // Otherwise, just view profile
    console.log('Other profile - navigating to user profile');
    navigate(`/user/${member.userId}`, {
      state: { username: member.username },
    });
  };

  const handleChangeMemberRole = async (newRole, transferAdminRights = false) => {
    if (!selectedMember) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/GroupChat/${conversationId}/members/${selectedMember.userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ role: newRole, transferAdminRights }),
        }
      );

      if (!response.ok) throw new Error('Failed to change member role');

      alert('Đã cập nhật quyền thành viên');
      await loadMembers();
      setShowActionMenu(false);
    } catch (error) {
      console.error('Change role error:', error);
      alert('Không thể thay đổi quyền');
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/GroupChat/${conversationId}/members/${selectedMember.userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to remove member');

      alert('Đã xóa thành viên');
      await loadMembers();
      setShowActionMenu(false);
    } catch (error) {
      console.error('Remove member error:', error);
      alert('Không thể xóa thành viên');
    }
  };

  const getAvatarUri = (uri) => {
    if (!uri) return '/default-avatar.png';
    if (uri.startsWith('http') || uri.startsWith('blob:')) return uri;
    return uri;
  };

  const isCreator = (member) => {
    return groupCreatedBy && Number(member.userId) === Number(groupCreatedBy);
  };

  if (loading) {
    return (
      <div className="group-members-container">
        <div className="group-members-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <MdArrowBack size={24} />
          </button>
          <div className="header-center">
            <h3>Thành viên</h3>
          </div>
          <div className="header-right" />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group-members-container">
      {/* Header */}
      <div className="group-members-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <MdArrowBack size={24} />
        </button>
        <div className="header-center">
          <h3>Thành viên</h3>
          <p className="header-subtitle">{members.length} thành viên</p>
        </div>
        <div className="header-right" />
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <span className="search-icon"><MdSearch size={20} /></span>
        <input
          type="text"
          className="search-input"
          placeholder="Tìm kiếm thành viên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.length > 0 && (
          <button className="clear-button" onClick={() => setSearchQuery('')}>
            <MdClose size={20} />
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="members-list">
        {filteredMembers.length === 0 ? (
          <div className="empty-container">
            <span className="empty-icon"><MdGroup size={48} /></span>
            <p className="empty-text">{searchQuery ? 'Không tìm thấy thành viên' : 'Chưa có thành viên'}</p>
          </div>
        ) : (
          filteredMembers.map((member, index) => (
            <div
              key={member.id || index}
              className="member-item"
              onClick={() => handleMemberPress(member)}
            >
              <div className="member-avatar">
                <img src={getAvatarUri(member.avatar)} alt={member.fullName} />
                {member.role === 'admin' && (
                  <div className="admin-badge">
                    <span><MdShield size={16} /></span>
                  </div>
                )}
              </div>

              <div className="member-info">
                <p className="member-name">{member.fullName}</p>
                <p className="member-username">@{member.username}</p>
              </div>

              {member.role === 'admin' && (
                <div className="admin-label">
                  <span>Admin</span>
                </div>
              )}
              {isCreator(member) && (
                <div className="creator-label">
                  <span>Creator</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Menu Modal */}
      {showActionMenu && selectedMember && (
        <div className="action-menu-overlay" onClick={() => setShowActionMenu(false)}>
          <div className="action-menu" onClick={(e) => e.stopPropagation()}>
            <h4>{selectedMember.fullName || selectedMember.username}</h4>

            <button
              className="action-menu-item"
              onClick={() => {
                setShowActionMenu(false);
                navigate(`/user/${selectedMember.userId}`, {
                  state: { username: selectedMember.username },
                });
              }}
            >
              Xem hồ sơ
            </button>

            {!isCreator(selectedMember) && (
              <>
                {selectedMember.role !== 'admin' && (
                  <>
                    <button
                      className="action-menu-item"
                      onClick={() => handleChangeMemberRole('admin', false)}
                    >
                      Thăng làm Admin
                    </button>
                    <button
                      className="action-menu-item"
                      onClick={() => handleChangeMemberRole('admin', true)}
                    >
                      Chuyển quyền Admin
                    </button>
                  </>
                )}

                {selectedMember.role === 'admin' && (
                  <button
                    className="action-menu-item"
                    onClick={() => handleChangeMemberRole('member', false)}
                  >
                    Hạ quyền Admin
                  </button>
                )}

                <button className="action-menu-item danger" onClick={handleRemoveMember}>
                  Xóa khỏi nhóm
                </button>
              </>
            )}

            <button className="action-menu-item cancel" onClick={() => setShowActionMenu(false)}>
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
