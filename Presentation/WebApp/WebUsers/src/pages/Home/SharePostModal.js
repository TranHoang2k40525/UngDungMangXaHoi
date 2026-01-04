import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFollowing, getFollowers } from '../../api/Api';
import MessageAPI from '../../API/MessageAPI';
import './SharePostModal.css';

const SharePostModal = ({ post, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('options'); // 'options' or 'friends'
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingTo, setSendingTo] = useState(new Set());
  const [sentTo, setSentTo] = useState(new Set());

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
    }
  }, [activeTab]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const [following, followers] = await Promise.all([
        getFollowing().catch(() => []),
        getFollowers().catch(() => []),
      ]);

      const raw = [
        ...(Array.isArray(following) ? following : []),
        ...(Array.isArray(followers) ? followers : []),
      ];

      const friendsMap = new Map();
      raw.forEach((u) => {
        if (!u) return;
        const id = u.id ?? u.userId ?? u.user_id ?? null;
        const username = u.username ?? u.userName ?? u.user_name ?? null;
        const fullName = u.fullName ?? u.full_name ?? u.fullname ?? null;
        const avatarUrl = u.avatarUrl ?? u.avatar_url ?? u.avatar ?? null;

        if (id != null) {
          friendsMap.set(Number(id), {
            id: Number(id),
            username: username || String(id),
            fullName,
            avatarUrl,
          });
        }
      });

      setFriends(Array.from(friendsMap.values()));
    } catch (error) {
      console.warn('[SharePostModal] Load friends error:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleShareToFeed = () => {
    onClose();
    navigate('/share-post', { state: { post } });
  };

  const handleShareToStory = () => {
    onClose();
    // Note: Story with post embed would need backend support
    // For now, just navigate to create story
    navigate('/create-story');
  };

  const handleSendToMessenger = async (friendId) => {
    try {
      setSendingTo(prev => new Set([...prev, friendId]));

      // Get or create conversation
      const conversation = await MessageAPI.getOrCreateConversation(friendId);
      
      if (!conversation) {
        throw new Error('Không thể tạo cuộc trò chuyện');
      }

      // Send post link as message
      const postLink = `${window.location.origin}/post/${post.id || post.postId}`;
      const messageContent = `📤 Đã chia sẻ bài đăng: ${postLink}`;
      
      await MessageAPI.sendMessage(conversation.id, messageContent);

      setSentTo(prev => new Set([...prev, friendId]));
      
      // Show success for 1 second
      setTimeout(() => {
        setSentTo(prev => {
          const newSet = new Set(prev);
          newSet.delete(friendId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      console.error('[SharePostModal] Send error:', error);
      alert('Không thể gửi tin nhắn');
    } finally {
      setSendingTo(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const handleOpenMessenger = () => {
    setActiveTab('friends');
  };

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.fullName && f.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          {activeTab === 'friends' && (
            <button 
              className="modal-back-button" 
              onClick={() => setActiveTab('options')}
            >
              ←
            </button>
          )}
          <h2 className="modal-title">
            {activeTab === 'options' ? 'Chia sẻ bài đăng' : 'Gửi đến'}
          </h2>
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="share-modal-body">
          {activeTab === 'options' ? (
            <div className="share-options">
              <button className="share-option-button" onClick={handleShareToFeed}>
                <div className="option-icon">📱</div>
                <div className="option-text">
                  <div className="option-title">Chia sẻ lên bảng tin</div>
                  <div className="option-description">Chia sẻ lên dòng thời gian của bạn</div>
                </div>
              </button>

              <button className="share-option-button" onClick={handleShareToStory}>
                <div className="option-icon">⭕</div>
                <div className="option-text">
                  <div className="option-title">Chia sẻ lên Story</div>
                  <div className="option-description">Chia sẻ dưới dạng story 24h</div>
                </div>
              </button>

              <button className="share-option-button" onClick={handleOpenMessenger}>
                <div className="option-icon">💬</div>
                <div className="option-text">
                  <div className="option-title">Gửi tin nhắn</div>
                  <div className="option-description">Gửi đến bạn bè qua tin nhắn</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="friends-list-container">
              {/* Search */}
              <div className="search-section">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm kiếm bạn bè..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Friends List */}
              <div className="friends-list">
                {loadingFriends ? (
                  <div className="friends-loading">
                    <div className="loading-spinner" />
                    <div className="loading-text">Đang tải...</div>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="friends-empty">
                    <div className="empty-icon">👥</div>
                    <div className="empty-text">
                      {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}
                    </div>
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSending = sendingTo.has(friend.id);
                    const isSent = sentTo.has(friend.id);

                    return (
                      <div key={friend.id} className="friend-item">
                        <div className="friend-info">
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt={friend.username}
                              className="friend-avatar"
                            />
                          ) : (
                            <div className="friend-avatar friend-avatar-placeholder">
                              {friend.username[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="friend-text">
                            <div className="friend-username">{friend.username}</div>
                            {friend.fullName && (
                              <div className="friend-fullname">{friend.fullName}</div>
                            )}
                          </div>
                        </div>

                        <button
                          className={`send-button ${isSent ? 'sent' : ''}`}
                          onClick={() => handleSendToMessenger(friend.id)}
                          disabled={isSending || isSent}
                        >
                          {isSending ? (
                            <span className="button-spinner" />
                          ) : isSent ? (
                            '✓ Đã gửi'
                          ) : (
                            'Gửi'
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;
