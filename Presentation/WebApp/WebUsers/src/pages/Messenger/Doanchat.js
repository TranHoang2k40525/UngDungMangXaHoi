import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MessageAPI from '../../API/MessageAPI';
import signalRService from '../../Services/signalRService';
import './Doanchat.css';

// Typing indicator animation component
const TypingDot = ({ delay }) => {
  return (
    <div 
      className="typing-dot" 
      style={{ 
        animationDelay: `${delay}ms` 
      }}
    />
  );
};

export default function Doanchat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: paramUserId } = useParams();
  
  // Get user info from location state or params
  const { userId, userName, userAvatar, username } = location.state || {
    userId: paramUserId,
    userName: 'User',
    userAvatar: null,
    username: '@user'
  };

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const hasScrolledToBottom = useRef(false);
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load current user ID from localStorage
  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const myUserId = userInfo.userId || userInfo.user_id || userInfo.id;
        setCurrentUserId(myUserId);
        console.log('[Doanchat] Current user loaded:', myUserId);
      } catch (error) {
        console.error('[Doanchat] Error loading current user:', error);
      }
    };
    
    loadCurrentUser();
  }, []);

  // Load conversation and messages (Page 1 = newest messages)
  const loadConversation = async () => {
    try {
      setLoading(true);
      const pageSize = 10;
      
      console.log(`[Doanchat] REQUEST: page=1, pageSize=${pageSize}`);
      const response = await MessageAPI.getConversationDetail(userId, 1, pageSize);
      
      if (response.success && response.data) {
        setConversationDetail(response.data);
        const totalMessages = response.data.total_messages || 0;
        const totalPages = Math.max(1, Math.ceil(totalMessages / pageSize));
        
        console.log(`[Doanchat] RESPONSE: Got ${response.data.messages.length} messages, total: ${totalMessages}, pages: ${totalPages}`);
        
        // Backend returns newest first, reverse to show oldest at top
        const reversedMessages = [...response.data.messages].reverse();
        setMessages(reversedMessages);
        setCurrentPage(1);
        setHasMoreMessages(totalPages > 1);
        
        // Scroll to bottom only once after loading
        if (!hasScrolledToBottom.current) {
          setTimeout(() => {
            scrollToBottom();
            hasScrolledToBottom.current = true;
          }, 150);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      
      // If conversation doesn't exist, create on first message
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('[Doanchat] No conversation yet, will create on first message');
        setMessages([]);
        setConversationDetail(null);
        setHasMoreMessages(false);
      } else {
        alert('Không thể tải tin nhắn');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load more older messages
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !conversationDetail) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const pageSize = 10;

      console.log(`[Doanchat] Loading more messages, page: ${nextPage}`);

      const response = await MessageAPI.getConversationDetail(userId, nextPage, pageSize);

      if (response.success && response.data && response.data.messages.length > 0) {
        const totalMessages = response.data.total_messages || 0;
        const totalPages = Math.max(1, Math.ceil(totalMessages / pageSize));

        const olderMessages = [...response.data.messages].reverse();
        setMessages(prev => [...olderMessages, ...prev]);
        setCurrentPage(nextPage);
        setHasMoreMessages(nextPage < totalPages);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setHasMoreMessages(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load conversation ONLY ONCE when component mounts
  useEffect(() => {
    console.log('[Doanchat] Component mounted - loading conversation');
    loadConversation();
  }, [userId]);

  // Setup SignalR listeners
  useEffect(() => {
    console.log('[Doanchat] Setting up SignalR listeners');

    const handleMessageReceived = (newMessage) => {
      console.log('[Doanchat] Message received:', newMessage);
      
      if (newMessage.sender_id === userId) {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
      }
    };

    const handleMessageSent = (newMessage) => {
      console.log('[Doanchat] Message sent confirmation:', newMessage);
      setMessages(prev => {
        const exists = prev.some(m => m.message_id === newMessage.message_id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
    };

    const handleUserTyping = (data) => {
      if (data.userId === userId) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const handleOnlineUsers = (userIds) => {
      console.log('[Doanchat] Online users:', userIds);
      setIsOtherUserOnline(userIds.includes(userId));
    };

    const handleUserOnline = (onlineUserId) => {
      console.log('[Doanchat] User online:', onlineUserId);
      if (onlineUserId === userId) {
        setIsOtherUserOnline(true);
      }
    };

    const handleUserOffline = (offlineUserId) => {
      console.log('[Doanchat] User offline:', offlineUserId);
      if (offlineUserId === userId) {
        setIsOtherUserOnline(false);
      }
    };

    const handleMessageRecalled = (recalledMessage) => {
      console.log('[Doanchat] Message recalled:', recalledMessage);
      setMessages(prev => prev.map(msg => 
        msg.message_id === recalledMessage.message_id ? recalledMessage : msg
      ));
    };

    const setupListeners = async () => {
      try {
        const messageConn = await signalRService.connectToMessage();
        if (messageConn) {
          messageConn.on('ReceiveMessage', handleMessageReceived);
          messageConn.on('MessageSent', handleMessageSent);
          messageConn.on('UserTyping', handleUserTyping);
          messageConn.on('OnlineUsers', handleOnlineUsers);
          messageConn.on('UserOnline', handleUserOnline);
          messageConn.on('UserOffline', handleUserOffline);
          messageConn.on('MessageRecalled', handleMessageRecalled);
        }
      } catch (e) {
        console.warn('[Doanchat] Setup listeners error:', e);
      }
    };

    setupListeners();

    return () => {
      console.log('[Doanchat] Cleaning up SignalR listeners');
      try {
        if (signalRService.messageConnection) {
          signalRService.messageConnection.off('ReceiveMessage', handleMessageReceived);
          signalRService.messageConnection.off('MessageSent', handleMessageSent);
          signalRService.messageConnection.off('UserTyping', handleUserTyping);
          signalRService.messageConnection.off('OnlineUsers', handleOnlineUsers);
          signalRService.messageConnection.off('UserOnline', handleUserOnline);
          signalRService.messageConnection.off('UserOffline', handleUserOffline);
          signalRService.messageConnection.off('MessageRecalled', handleMessageRecalled);
        }
      } catch (e) { /* ignore */ }
    };
  }, [userId]);

  // Mark as read when conversation is loaded
  useEffect(() => {
    if (conversationDetail?.conversation_id) {
      // MarkAsRead hub method may not be available on server
      console.log('[Doanchat] Conversation loaded:', conversationDetail.conversation_id);
    }
  }, [conversationDetail?.conversation_id]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
      }
    });
  }, []);

  // Handle scroll to load more
  const handleScroll = (event) => {
    const { scrollTop } = event.target;

    if (scrollTop < 50 && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }
  };

  // Format offline time
  const formatOfflineTime = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
  };

  // Recall message
  const handleRecallMessage = async () => {
    if (!selectedMessage) return;

    try {
      setShowConfirmModal(false);
      setHighlightedMessageId(null);
      console.log('[Doanchat] Recalling message:', selectedMessage.message_id);
      
      if (signalRService.messageConnection) {
        await signalRService.messageConnection.invoke('RecallMessage', selectedMessage.message_id);
      } else {
        throw new Error('SignalR not connected');
      }
      
      setMessages(prev => prev.map(msg => 
        msg.message_id === selectedMessage.message_id 
          ? { ...msg, is_recalled: true, content: 'Tin nhắn đã bị thu hồi' }
          : msg
      ));
      
      setSelectedMessage(null);
    } catch (error) {
      console.error('[Doanchat] Error recalling message:', error);
      alert('Không thể thu hồi tin nhắn: ' + error.message);
      setHighlightedMessageId(null);
    }
  };

  // Long press handler
  const handleLongPress = (msg, event) => {
    if (msg.sender_id === currentUserId && !msg.is_recalled) {
      setSelectedMessage(msg);
      setHighlightedMessageId(msg.message_id);
      
      const rect = event.currentTarget.getBoundingClientRect();
      setActionMenuPosition({ x: rect.left, y: rect.top - 50 });
      
      setShowActionModal(true);
    }
  };

  // Close action modal
  const closeActionModal = () => {
    setShowActionModal(false);
    setHighlightedMessageId(null);
  };

  // Open confirm modal
  const openConfirmModal = () => {
    closeActionModal();
    setTimeout(() => setShowConfirmModal(true), 200);
  };

  // Close confirm modal
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setHighlightedMessageId(null);
    setSelectedMessage(null);
  };

  // Pick image
  const pickImage = () => {
    fileInputRef.current?.click();
  };

  // Handle file selected
  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await sendImageMessage(file);
    event.target.value = ''; // Reset input
  };

  // Send image message
  const sendImageMessage = async (file) => {
    try {
      setUploadingImage(true);
      console.log('[Doanchat] Uploading image:', file.name);

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';

      const uploadResponse = await fetch(`${apiUrl}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { imageUrl } = await uploadResponse.json();
      console.log('[Doanchat] Image uploaded:', imageUrl);

      if (signalRService.messageConnection) {
        await signalRService.messageConnection.invoke('SendMessage', {
          receiver_id: userId,
          content: '',
          message_type: 'Image',
          media_url: imageUrl
        });
      } else {
        throw new Error('SignalR not connected');
      }

      setUploadingImage(false);
    } catch (error) {
      console.error('[Doanchat] Error sending image:', error);
      alert('Không thể gửi ảnh');
      setUploadingImage(false);
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() || sending) {
      return;
    }

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    handleTyping(false);

    console.log('[Doanchat] Sending message:', messageText);

    try {
      if (signalRService.messageConnection) {
        await signalRService.messageConnection.invoke('SendMessage', {
          receiver_id: userId,
          content: messageText,
          message_type: 'Text',
          media_url: null
        });
        console.log('[Doanchat] Message sent via SignalR');
      } else {
        throw new Error('SignalR not connected');
      }
    } catch (error) {
      console.error('[Doanchat] SignalR send error:', error);
      
      try {
        const response = await MessageAPI.sendMessage(userId, messageText);
        if (response.success && response.data) {
          setMessages(prev => {
            const exists = prev.some(m => m.message_id === response.data.message_id);
            if (!exists) {
              return [...prev, response.data];
            }
            return prev;
          });
          scrollToBottom();
        }
      } catch (httpError) {
        console.error('[Doanchat] HTTP fallback error:', httpError);
        alert('Không thể gửi tin nhắn');
        setMessage(messageText);
      }
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (typing) => {
    if (typing === isTyping) return;
    
    setIsTyping(typing);
    
    try {
      if (signalRService.messageConnection) {
        signalRService.messageConnection.invoke('UserTyping', userId, typing).catch(e => {
          console.warn('[Doanchat] UserTyping invoke failed', e);
        });
      }
    } catch (e) {
      console.warn('[Doanchat] UserTyping error', e);
    }

    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        try {
          if (signalRService.messageConnection) {
            signalRService.messageConnection.invoke('UserTyping', userId, false).catch(e => {
              console.warn('[Doanchat] UserTyping stop failed', e);
            });
          }
        } catch (e) {
          console.warn('[Doanchat] UserTyping stop error', e);
        }
      }, 3000);
    }
  };

  // Handle text input change
  const handleTextChange = (text) => {
    setMessage(text);
    
    if (text.trim()) {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="doanchat-container">
      {/* Header */}
      <div className="doanchat-header">
        <button className="doanchat-back-button" onClick={() => navigate(-1)}>
          <i className="icon-back">←</i>
        </button>
        
        <div className="doanchat-header-center">
          <div className="doanchat-header-avatar-container">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="doanchat-header-avatar" />
            ) : (
              <div className="doanchat-header-avatar doanchat-default-avatar">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            {isOtherUserOnline && <div className="doanchat-header-online-indicator" />}
          </div>
          <div className="doanchat-header-text-container">
            <h2 className="doanchat-header-name">{userName || 'User'}</h2>
            {!isOtherUserOnline && otherUserLastSeen && (
              <p className="doanchat-header-status">
                {formatOfflineTime(otherUserLastSeen)}
              </p>
            )}
          </div>
        </div>

        <button className="doanchat-header-icon">
          <i className="icon-info"></i>
        </button>
      </div>

      {/* Chat Content */}
      <div 
        className="doanchat-chat-content" 
        ref={scrollViewRef}
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="doanchat-load-more-indicator">
            <div className="doanchat-spinner" />
            <span>Đang tải thêm...</span>
          </div>
        )}
        
        {loading || !currentUserId ? (
          <div className="doanchat-loading-container">
            <div className="doanchat-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="doanchat-profile-section">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="doanchat-profile-avatar" />
            ) : (
              <div className="doanchat-profile-avatar doanchat-default-avatar">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h3 className="doanchat-profile-name">{userName || 'User'}</h3>
            <p className="doanchat-profile-username">{username || '@user'}</p>
            <p className="doanchat-profile-info">
              {conversationDetail?.other_user_bio || 'Các bạn đang theo dõi nhau'}
            </p>
            <p className="doanchat-profile-bio">
              Bắt đầu trò chuyện ngay!
            </p>
          </div>
        ) : (
          <div className="doanchat-messages-container">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === currentUserId;
              const isHighlighted = highlightedMessageId === msg.message_id;
              
              return (
                <div 
                  key={msg.message_id || index} 
                  className={`doanchat-message-wrapper ${isOwnMessage ? 'own' : 'other'}`}
                >
                  {!isOwnMessage && (
                    userAvatar ? (
                      <img src={userAvatar} alt={userName} className="doanchat-message-avatar" />
                    ) : (
                      <div className="doanchat-message-avatar doanchat-default-avatar">
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )
                  )}
                  
                  <div 
                    className={`doanchat-message-bubble ${isOwnMessage ? 'own' : 'other'} ${isHighlighted ? 'highlighted' : ''}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleLongPress(msg, e);
                    }}
                  >
                    {msg.is_recalled ? (
                      <div className="doanchat-recalled-message-container">
                        <i className="icon-recalled">🚫</i>
                        <span className="doanchat-recalled-message">
                          {' Tin nhắn đã bị thu hồi'}
                        </span>
                      </div>
                    ) : msg.message_type === 'Image' && msg.media_url ? (
                      <div>
                        <img 
                          src={msg.media_url} 
                          alt="Message" 
                          className="doanchat-message-image"
                          onClick={() => window.open(msg.media_url, '_blank')}
                        />
                        {msg.content && (
                          <p className={`doanchat-message-text ${isOwnMessage ? 'own' : 'other'}`}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className={`doanchat-message-text ${isOwnMessage ? 'own' : 'other'}`}>
                        {msg.content}
                      </p>
                    )}
                    <span className={`doanchat-message-time ${isOwnMessage ? 'own' : 'other'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {otherUserTyping && (
              <div className="doanchat-typing-indicator-container">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="doanchat-message-avatar" />
                ) : (
                  <div className="doanchat-message-avatar doanchat-default-avatar">
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="doanchat-typing-bubble">
                  <div className="doanchat-typing-dots">
                    <TypingDot delay={0} />
                    <TypingDot delay={200} />
                    <TypingDot delay={400} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="doanchat-message-input-container">
        <div className="doanchat-input-wrapper">
          <textarea
            className="doanchat-message-input"
            value={message}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhắn tin..."
            disabled={sending}
            rows={1}
          />
        </div>

        <button 
          className={`doanchat-send-button ${sending ? 'disabled' : ''}`}
          onClick={handleSend}
          disabled={sending || !message.trim()}
        >
          {sending ? <div className="doanchat-spinner-small" /> : '↑'}
        </button>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="doanchat-action-modal-overlay" onClick={closeActionModal}>
          <div 
            className="doanchat-action-modal-content"
            style={{
              top: actionMenuPosition.y,
              left: actionMenuPosition.x
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="doanchat-action-button" onClick={openConfirmModal}>
              Thu hồi
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="doanchat-confirm-modal-overlay">
          <div className="doanchat-confirm-modal-content">
            <h3 className="doanchat-confirm-title">Thu hồi tin nhắn?</h3>
            <p className="doanchat-confirm-message">
              Tin nhắn này sẽ bị xóa với mọi người trong đoạn chat
            </p>
            
            <div className="doanchat-confirm-buttons">
              <button 
                className="doanchat-confirm-button cancel"
                onClick={closeConfirmModal}
              >
                Hủy
              </button>
              
              <button 
                className="doanchat-confirm-button recall"
                onClick={handleRecallMessage}
              >
                Thu hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
