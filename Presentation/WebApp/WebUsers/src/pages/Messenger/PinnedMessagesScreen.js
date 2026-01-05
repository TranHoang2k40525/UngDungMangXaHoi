import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdClose, MdPlayCircle, MdPushPin, MdRefresh } from 'react-icons/md';
import './PinnedMessagesScreen.css';
// import * as groupChatService from '../../Services/groupChatService';

export default function PinnedMessagesScreen() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();
  const { groupName } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  useEffect(() => {
    loadPinnedMessages();
  }, [conversationId]);

  const loadPinnedMessages = async () => {
    try {
      setLoading(true);
      // Try API first (server source of truth)
      try {
        // const apiPinned = await groupChatService.getPinnedMessages(conversationId);
        const apiPinned = null; // TODO: implement API call
        if (Array.isArray(apiPinned)) {
          // Normalize items to local message shape
          const normalized = apiPinned.map(m => ({
            id: m.messageId || m.MessageId || m.id,
            userName: m.userName || m.UserName,
            message: m.content || m.Content,
            mediaUri: m.fileUrl || m.FileUrl,
            mediaType: m.messageType || m.MessageType,
            timestamp: m.createdAt || m.CreatedAt,
            pinnedAt: m.pinnedAt || m.PinnedAt || new Date().toISOString(),
            isPinned: true,
          }));
          normalized.sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
          setPinnedMessages(normalized);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('getPinnedMessages API failed, fallback to localStorage', apiErr);
      }

      // Fallback to localStorage if API not available
      const storageKey = `group_messages_${conversationId}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        // Filter only pinned messages
        const pinned = messages.filter(msg => msg.isPinned === true);
        // Sort by pinned date (most recent first)
        pinned.sort((a, b) => {
          const dateA = new Date(a.pinnedAt || a.timestamp);
          const dateB = new Date(b.pinnedAt || b.timestamp);
          return dateB - dateA;
        });
        setPinnedMessages(pinned);
      } else {
        setPinnedMessages([]);
      }
    } catch (error) {
      console.error('Load pinned messages error:', error);
      alert('Lỗi: Không thể tải tin nhắn đã ghim');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPinnedMessages();
    setRefreshing(false);
  };

  const handleUnpinMessage = async (messageId) => {
    const confirmed = window.confirm('Bạn có chắc muốn bỏ ghim tin nhắn này?');
    
    if (!confirmed) return;

    try {
      // Load all messages
      const storageKey = `group_messages_${conversationId}`;
      const savedMessages = localStorage.getItem(storageKey);
      
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        const updatedMessages = messages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, isPinned: false, pinnedAt: null };
          }
          return msg;
        });
        
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        
        // Update local state
        setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        alert('Đã bỏ ghim tin nhắn');
      }
    } catch (error) {
      console.error('Unpin message error:', error);
      alert('Lỗi: Không thể bỏ ghim tin nhắn');
    }
  };

  const handleGoToMessage = (message) => {
    // Navigate back to GroupChat and scroll to this message
    navigate(`/messenger/group-chat/${conversationId}`, {
      state: {
        groupName,
        scrollToMessageId: message.id,
      }
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const renderMessageItem = (message, index) => (
    <div 
      key={message.id || index}
      className="message-item"
      onClick={() => handleGoToMessage(message)}
    >
      <div className="message-header">
        <div className="user-info">
          <div className="user-name">{message.userName || 'Người dùng'}</div>
          <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
        </div>
        
        <button
          className="unpin-button"
          onClick={(e) => {
            e.stopPropagation();
            handleUnpinMessage(message.id);
          }}
        >
          <span className="unpin-icon"><MdClose size={20} /></span>
        </button>
      </div>

      <div className="message-content">
        {message.mediaUri && (
          <div className="media-preview">
            {message.mediaType === 'image' ? (
              <img 
                src={message.mediaUri} 
                alt=""
                className="media-image"
              />
            ) : (
              <div className="video-placeholder">
                <span className="play-icon"><MdPlayCircle size={32} /></span>
              </div>
            )}
          </div>
        )}
        
        {message.message && (
          <div className="message-text">
            {message.message}
          </div>
        )}
      </div>

      <div className="message-footer">
        <span className="pin-icon"><MdPushPin size={16} /></span>
        <span className="pinned-label">Đã ghim</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="pinned-messages-container">
        <div className="pinned-messages-header">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            <span className="back-icon">‹</span>
          </button>
          <div className="header-title">Tin nhắn đã ghim</div>
          <div style={{ width: '40px' }} />
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <div className="loading-text">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pinned-messages-container">
      <div className="pinned-messages-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <span className="back-icon">‹</span>
        </button>
        <div className="header-title">Tin nhắn đã ghim</div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Pinned Count */}
      {pinnedMessages.length > 0 && (
        <div className="count-container">
          <span className="count-icon"><MdPushPin size={20} /></span>
          <span className="count-text">
            {pinnedMessages.length} tin nhắn được ghim
          </span>
        </div>
      )}

      {/* Refresh Button */}
      <button 
        className="refresh-button"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}><MdRefresh size={20} /></span>
      </button>

      <div className="content">
        {pinnedMessages.length > 0 ? (
          pinnedMessages.map((message, index) => renderMessageItem(message, index))
        ) : (
          <div className="empty-container">
            <div className="empty-icon"><MdPushPin size={48} /></div>
            <div className="empty-title">Chưa có tin nhắn được ghim</div>
            <div className="empty-text">
              Nhấn giữ vào tin nhắn trong nhóm và chọn "Ghim" để ghim tin nhắn quan trọng
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
