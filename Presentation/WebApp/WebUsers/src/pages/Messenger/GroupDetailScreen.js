import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getGroupInfo, getGroupMembers, API_BASE_URL } from '../../API/Api';
import signalRService from '../../Services/signalRService';
import { MdArrowBack } from 'react-icons/md';
import './GroupDetailScreen.css';

export default function GroupDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const groupName = location.state?.groupName || 'Group';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');

  useEffect(() => {
    loadData();
  }, [conversationId]);

  // SignalR: Listen for avatar updates
  useEffect(() => {
    let mounted = true;

    const onAvatarUpdated = async (data) => {
      try {
        if (!mounted || !data) return;

        console.log('[GroupDetail] GroupAvatarUpdated:', data);

        const convIdRaw = data.conversationId ?? data.conversation_id ?? data.id ?? conversationId;
        const convIdStr = convIdRaw != null ? String(convIdRaw) : null;
        if (!convIdStr || String(conversationId) !== convIdStr) return;

        const avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
        if (!avatarUrl) return;

        const cacheBusted = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

        try {
          localStorage.setItem(`groupAvatar_${convIdStr}`, cacheBusted);
        } catch (e) {
          console.warn('[GroupDetail] Failed to persist avatar override', e);
        }

        setGroupInfo((prev) => ({ ...(prev || {}), avatarUrl: cacheBusted }));
      } catch (e) {
        console.error('[GroupDetail] onAvatarUpdated error', e);
      }
    };

    (async () => {
      try {
        await signalRService.connectToChat();
        await signalRService.joinGroup(conversationId);
        console.log('[GroupDetail] Joined group for realtime updates:', conversationId);
        signalRService.onGroupAvatarUpdated(onAvatarUpdated);
      } catch (e) {
        console.warn('[GroupDetail] SignalR setup failed', e);
      }
    })();

    return () => {
      mounted = false;
      try {
        signalRService.leaveGroup(conversationId).catch(() => {});
      } catch (e) {}
    };
  }, [conversationId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user ID
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.user_id || user.userId);
      }

      // Load group info and members
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);

      // Check for saved avatar
      const savedAvatarKey = `groupAvatar_${conversationId}`;
      const savedAvatar = localStorage.getItem(savedAvatarKey);

      if (savedAvatar) {
        groupData.avatarUrl = savedAvatar;
      }

      setGroupInfo(groupData);
      setMembers(membersData);

      // Check if current user is admin
      if (userStr) {
        const user = JSON.parse(userStr);
        const currentMember = membersData.find((m) => m.userId === (user.user_id || user.userId));
        setIsAdmin(currentMember?.role === 'admin');

        // Identify creator
        try {
          if (groupData && (groupData.createdBy || groupData.createdBy === 0)) {
            setIsCreator(groupData.createdBy === (user.user_id || user.userId));
          } else {
            const adminMembers = membersData
              .filter((m) => m.role === 'admin')
              .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
            if (adminMembers.length > 0) {
              setIsCreator(adminMembers[0].userId === (user.user_id || user.userId));
            }
          }
        } catch (e) {
          console.warn('Error determining creator:', e);
        }
      }
    } catch (error) {
      console.error('Load group data error:', error);
      alert('Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleInviteMember = () => {
    if (groupInfo?.invitePermission === 'admin' && !isAdmin) {
      if (members && members.length > 0) {
        alert('Chỉ admin mới có quyền mời thành viên vào nhóm này');
        return;
      }
    }

    if (groupInfo?.maxMembers && groupInfo?.currentMemberCount >= groupInfo?.maxMembers) {
      alert(`Nhóm đã đạt giới hạn ${groupInfo.maxMembers} thành viên`);
      return;
    }

    navigate(`/messenger/group/${conversationId}/invite`, {
      state: {
        groupName: groupInfo?.name || groupName,
        currentMembers: members,
        currentUserId,
      },
    });
  };

  const handleChangeAvatar = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/GroupChat/${conversationId}/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload avatar');

        const result = await response.json();
        const serverUrl = result?.data?.avatarUrl || result?.avatarUrl || null;

        if (serverUrl) {
          localStorage.setItem(`groupAvatar_${conversationId}`, serverUrl);
          setGroupInfo((prev) => ({ ...prev, avatarUrl: serverUrl }));

          try {
            await signalRService.updateGroupAvatar(conversationId, serverUrl);
            console.log('[GroupDetail] Notified server of avatar change');
          } catch (e) {
            console.warn('[GroupDetail] SignalR notify failed', e);
          }

          alert('Đã cập nhật ảnh nhóm');
        }
      } catch (error) {
        console.error('Upload avatar error:', error);
        alert('Không thể cập nhật ảnh');
      }
    };

    input.click();
  };

  const handleLeaveGroup = async () => {
    if (isAdmin) {
      if (!window.confirm('Bạn là quản trị viên nhóm. Xóa nhóm sẽ xóa toàn bộ cuộc trò chuyện cho tất cả thành viên. Bạn có chắc muốn xóa?')) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/GroupChat/${conversationId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) throw new Error('Failed to delete group');

        alert('Đã xóa nhóm');
        navigate('/messenger');
      } catch (error) {
        console.error('Delete group error:', error);
        alert('Không thể xóa nhóm');
      }
      return;
    }

    if (!window.confirm('Bạn có chắc muốn rời khỏi nhóm này? Bạn sẽ không thể xem tin nhắn của nhóm nữa.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/GroupChat/${conversationId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to leave group');

      // Clean up local storage
      localStorage.removeItem(`groupMembers_${conversationId}`);
      localStorage.removeItem(`groupInfo_${conversationId}`);
      localStorage.removeItem(`group_messages_${conversationId}`);
      localStorage.removeItem(`groupAvatar_${conversationId}`);

      alert('Đã rời khỏi nhóm');
      navigate('/messenger');
    } catch (error) {
      console.error('Leave group error:', error);
      alert('Không thể rời khỏi nhóm');
    }
  };

  const handleSaveGroupName = async () => {
    const newName = (editedGroupName || '').trim();
    if (!newName) {
      alert('Tên nhóm không được để trống');
      return;
    }

    try {
      setGroupInfo((prev) => ({ ...(prev || {}), name: newName }));

      const groupInfoKey = `groupInfo_${conversationId}`;
      try {
        const saved = localStorage.getItem(groupInfoKey);
        let info = {};
        if (saved) {
          info = JSON.parse(saved) || {};
        }
        info.name = newName;
        localStorage.setItem(groupInfoKey, JSON.stringify(info));
      } catch (storageErr) {
        console.warn('Failed to save group name locally', storageErr);
      }

      const response = await fetch(`${API_BASE_URL}/api/GroupChat/${conversationId}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) throw new Error('Failed to update group name');

      try {
        await signalRService.updateGroupName(conversationId, newName);
        console.log('[GroupDetail] Notified server of name change');
      } catch (e) {
        console.warn('[GroupDetail] SignalR notify failed', e);
      }

      setShowEditNameModal(false);
      alert('Tên nhóm đã được cập nhật');
    } catch (err) {
      console.error('Save group name error', err);
      alert('Không thể cập nhật tên nhóm');
    }
  };

  const getMediaUri = (uri) => {
    if (!uri) return '/default-group.png';
    const s = String(uri);
    if (s.startsWith('http') || s.startsWith('blob:') || s.startsWith('data:')) return s;
    if (s.startsWith('/')) return `${API_BASE_URL}${s}`;
    return `${API_BASE_URL}/${s}`;
  };

  if (loading) {
    return (
      <div className="group-detail-container">
        <div className="group-detail-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <MdArrowBack size={24} />
          </button>
          <h3>Chi tiết nhóm</h3>
          <div style={{ width: 40 }} />
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-detail-container">
      <div className="group-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <MdArrowBack size={24} />
        </button>
        <h3>Chi tiết nhóm</h3>
        <button className="more-button">⋯</button>
      </div>

      <div className="group-detail-content">
        {/* Group Info Section */}
        <div className="group-info-section">
          <div className="group-avatar-container" onClick={handleChangeAvatar}>
            <img
              className="group-avatar-image"
              src={getMediaUri(groupInfo?.avatarUrl)}
              alt={groupInfo?.name}
            />
            <div className="camera-icon-badge">📷</div>
          </div>

          <h2 className="group-name">{groupInfo?.name || groupName}</h2>

          <div className="group-actions-row">
            <button className="add-member-button" onClick={handleInviteMember}>
              <span>👤+</span>
              <span>Thêm thành viên</span>
            </button>

            <button
              className="edit-name-button"
              onClick={() => {
                setEditedGroupName(groupInfo?.name || groupName || '');
                setShowEditNameModal(true);
              }}
            >
              ✏️
            </button>
          </div>

          <div className="group-stats">
            <div className="stat-item">
              <p className="stat-value">{groupInfo?.currentMemberCount || members.length}</p>
              <p className="stat-label">Thành viên</p>
            </div>
            {groupInfo?.maxMembers && (
              <div className="stat-item">
                <p className="stat-value">{groupInfo.maxMembers}</p>
                <p className="stat-label">Giới hạn</p>
              </div>
            )}
          </div>

          <div className="permission-info">
            <span>{groupInfo?.invitePermission === 'admin' ? '🛡️' : '👥'}</span>
            <p>
              {groupInfo?.invitePermission === 'admin'
                ? 'Chỉ admin mới có thể mời thành viên'
                : 'Tất cả thành viên có thể mời'}
            </p>
          </div>
        </div>

        {/* Menu Options */}
        <div className="menu-section">
          <div
            className="menu-item"
            onClick={() =>
              navigate(`/messenger/group/${conversationId}/members`, {
                state: { groupName: groupInfo?.name || groupName },
              })
            }
          >
            <div className="menu-icon-container" style={{ backgroundColor: '#DBEAFE' }}>
              <span style={{ color: '#3B82F6' }}>👥</span>
            </div>
            <div className="menu-text-container">
              <p className="menu-title">Xem thành viên</p>
              <p className="menu-subtitle">{members.length} thành viên</p>
            </div>
            <span className="chevron">›</span>
          </div>

          <div
            className="menu-item"
            onClick={() =>
              navigate(`/messenger/group/${conversationId}/pinned`, {
                state: { groupName: groupInfo?.name || groupName },
              })
            }
          >
            <div className="menu-icon-container" style={{ backgroundColor: '#D1FAE5' }}>
              <span style={{ color: '#10B981' }}>📌</span>
            </div>
            <div className="menu-text-container">
              <p className="menu-title">Tin nhắn đã ghim</p>
              <p className="menu-subtitle">Xem các tin nhắn quan trọng</p>
            </div>
            <span className="chevron">›</span>
          </div>

          <div
            className="menu-item"
            onClick={() =>
              navigate(`/messenger/group/${conversationId}/media`, {
                state: { groupName: groupInfo?.name || groupName },
              })
            }
          >
            <div className="menu-icon-container" style={{ backgroundColor: '#EDE9FE' }}>
              <span style={{ color: '#8B5CF6' }}>🖼️</span>
            </div>
            <div className="menu-text-container">
              <p className="menu-title">Phương tiện & liên kết</p>
              <p className="menu-subtitle">Ảnh, video, file, liên kết</p>
            </div>
            <span className="chevron">›</span>
          </div>
        </div>

        {/* Leave/Delete Group Button */}
        <div className="danger-section">
          <button className="leave-button" onClick={handleLeaveGroup}>
            <span>{isCreator ? '🗑️' : '🚪'}</span>
            <span>{isCreator ? 'Xóa nhóm' : 'Rời khỏi nhóm'}</span>
          </button>
        </div>
      </div>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className="modal-overlay" onClick={() => setShowEditNameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Sửa tên nhóm</h3>
            <input
              type="text"
              value={editedGroupName}
              onChange={(e) => setEditedGroupName(e.target.value)}
              placeholder="Tên nhóm"
              maxLength={100}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-button-cancel" onClick={() => setShowEditNameModal(false)}>
                Hủy
              </button>
              <button className="modal-button-save" onClick={handleSaveGroupName}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
