import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders, followUser, unfollowUser } from '../../API/Api';
import { useUser } from '../../context/UserContext';
import { useFollow } from '../../context/FollowContext';
import './ReactionsListModal.css';

const REACTION_TYPES = [
  { type: null, emoji: null, label: 'Tất cả' },
  { type: 1, emoji: '❤️', label: 'Thích' },
  { type: 2, emoji: '😍', label: 'Yêu thích' },
  { type: 3, emoji: '😂', label: 'Haha' },
  { type: 4, emoji: '😮', label: 'Wow' },
  { type: 5, emoji: '😢', label: 'Buồn' },
  { type: 6, emoji: '😠', label: 'Phẫn nộ' },
];

const getReactionEmoji = (reactionType) => {
  switch (reactionType) {
    case 1: return '❤️';
    case 2: return '😍';
    case 3: return '😂';
    case 4: return '😮';
    case 5: return '😢';
    case 6: return '😠';
    default: return '❤️';
  }
};

const ReactionsListModal = ({ postId, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const { isFollowed, markAsFollowed, markAsUnfollowed } = useFollow();
  
  const [reactions, setReactions] = useState([]);
  const [filteredReactions, setFilteredReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [followingUsers, setFollowingUsers] = useState(new Set());

  useEffect(() => {
    loadReactions();
  }, [postId]);

  useEffect(() => {
    filterReactions();
  }, [selectedTab, reactions]);

  const loadReactions = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/reactions/post/${postId}`,
        {
          headers: {
            ...headers,
            Accept: 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('[ReactionsListModal] API response:', result);

      if (result.data && Array.isArray(result.data)) {
        const formattedReactions = result.data.map((r) => ({
          ...r,
          avatarUrl: r.avatarUrl
            ? r.avatarUrl.startsWith('http')
              ? r.avatarUrl
              : `${API_BASE_URL}${r.avatarUrl}`
            : null,
        }));

        setReactions(formattedReactions);

        // Calculate counts for each reaction type
        const counts = {};
        result.data.forEach((r) => {
          counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
        });
        setReactionCounts(counts);

        // Initialize following state
        const following = new Set();
        formattedReactions.forEach(r => {
          if (isFollowed(r.userId)) {
            following.add(r.userId);
          }
        });
        setFollowingUsers(following);
      }
    } catch (error) {
      console.error('[ReactionsListModal] Error loading reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReactions = () => {
    if (selectedTab === null) {
      setFilteredReactions(reactions);
    } else {
      setFilteredReactions(
        reactions.filter((r) => r.reactionType === selectedTab)
      );
    }
  };

  const handleUserPress = (userId) => {
    onClose();
    if (currentUser && Number(userId) === Number(currentUser.userId)) {
      navigate('/profile');
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const handleFollowToggle = async (userId, username) => {
    const isCurrentlyFollowing = followingUsers.has(userId);
    
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(userId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        markAsUnfollowed(userId);
      } else {
        await followUser(userId);
        setFollowingUsers(prev => new Set([...prev, userId]));
        markAsFollowed(userId);
      }
    } catch (error) {
      console.error('[ReactionsListModal] Follow toggle error:', error);
      alert('Không thể thực hiện thao tác');
    }
  };

  const renderTabItem = (tabType, emoji, label) => {
    const count = tabType === null ? reactions.length : reactionCounts[tabType] || 0;

    if (count === 0 && tabType !== null) return null;

    const isSelected = selectedTab === tabType;

    return (
      <button
        key={tabType === null ? 'all' : tabType}
        className={`reaction-tab ${isSelected ? 'active' : ''}`}
        onClick={() => setSelectedTab(tabType)}
      >
        {emoji && <span className="tab-emoji">{emoji}</span>}
        <span className="tab-label">{label}</span>
        <span className="tab-count">{count}</span>
      </button>
    );
  };

  return (
    <div className="reactions-modal-overlay" onClick={onClose}>
      <div className="reactions-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reactions-modal-header">
          <h2 className="modal-title">Cảm xúc</h2>
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="reaction-tabs">
          {REACTION_TYPES.map((rt) =>
            renderTabItem(rt.type, rt.emoji, rt.label)
          )}
        </div>

        {/* User List */}
        <div className="reactions-list">
          {loading ? (
            <div className="reactions-loading">
              <div className="loading-spinner" />
              <div className="loading-text">Đang tải...</div>
            </div>
          ) : filteredReactions.length === 0 ? (
            <div className="reactions-empty">
              <div className="empty-icon">😊</div>
              <div className="empty-text">Chưa có cảm xúc nào</div>
            </div>
          ) : (
            filteredReactions.map((reaction) => {
              const isCurrentUser = currentUser && Number(reaction.userId) === Number(currentUser.userId);
              const isFollowing = followingUsers.has(reaction.userId);

              return (
                <div key={`${reaction.userId}-${reaction.reactionType}`} className="reaction-user-item">
                  <div 
                    className="user-info-section"
                    onClick={() => handleUserPress(reaction.userId)}
                  >
                    {reaction.avatarUrl ? (
                      <img
                        src={reaction.avatarUrl}
                        alt={reaction.username}
                        className="reaction-user-avatar"
                      />
                    ) : (
                      <div className="reaction-user-avatar reaction-user-avatar-placeholder">
                        {reaction.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="reaction-user-info">
                      <div className="reaction-username">{reaction.username}</div>
                      {reaction.fullName && (
                        <div className="reaction-fullname">{reaction.fullName}</div>
                      )}
                    </div>
                  </div>

                  <div className="reaction-actions">
                    <span className="reaction-emoji-display">
                      {getReactionEmoji(reaction.reactionType)}
                    </span>
                    {!isCurrentUser && (
                      <button
                        className={`follow-button ${isFollowing ? 'following' : ''}`}
                        onClick={() => handleFollowToggle(reaction.userId, reaction.username)}
                      >
                        {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionsListModal;
