import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import signalRService from '../../Services/signalRService';
import {
  getGroupInfo,
  getGroupMembers,
  API_BASE_URL,
} from '../../API/Api';
import ImageViewer from '../../Components/ImageViewer';
import './GroupChatScreen.css';

const EMOJI_LIST = [
  '❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '🎉', '😍',
  '😘', '😊', '😎', '🤔', '😴', '😭', '🤗', '🙏', '👏', '💪',
  '✨', '🌟', '💯', '🎊', '🎈', '🌈', '☀️', '⭐', '💖', '💕',
];

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function GroupChatScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const groupName = location.state?.groupName || 'Group Chat';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [lastReadMap, setLastReadMap] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Helper: Check if message contains only emoji
  const isEmojiOnly = (txt) => {
    try {
      const s = String(txt ?? '').trim();
      if (!s) return false;
      if (/\d/.test(s)) return false;
      if (s.length > 8) return false;
      return /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u.test(s);
    } catch (e) {
      return false;
    }
  };

  // Normalize media URI
  const getMediaUri = (uri) => {
    if (!uri) return null;
    const s = String(uri);
    if (s.startsWith('http') || s.startsWith('blob:') || s.startsWith('data:')) return s;
    if (s.startsWith('/')) return `${API_BASE_URL}${s}`;
    return `${API_BASE_URL}/${s}`;
  };

  // Load group data
  useEffect(() => {
    loadGroupData();
  }, [conversationId]);

  // SignalR setup
  useEffect(() => {
    let mounted = true;

    const setupSignalR = async () => {
      if (!currentUserId) return;

      try {
        console.log('[GroupChat] Setting up SignalR for conversation:', conversationId);

        await signalRService.connectToChat();
        await signalRService.joinGroup(conversationId);

        // Listen for new messages
        signalRService.onReceiveMessage((...args) => {
          if (!mounted) return;

          let payload = null;
          for (const a of args) {
            if (a && typeof a === 'object' && (a.id || a.messageId || a.content)) {
              payload = a;
              break;
            }
          }
          if (!payload) payload = args[0];

          console.log('[SignalR] ReceiveMessage:', payload);

          if (!payload || typeof payload !== 'object') return;

          const rawTimestamp = payload.timestamp || payload.createdAt || payload.created_at;
          const parsedTs = rawTimestamp ? new Date(rawTimestamp) : null;
          const timestampValid = parsedTs && !isNaN(parsedTs.getTime());

          const newMessage = {
            id: payload.id || payload.messageId,
            userId: payload.userId || payload.user_id,
            userName: payload.userName || payload.user_name || payload.user,
            userAvatar: payload.userAvatar || payload.user_avatar,
            message: payload.content || payload.message,
            timestamp: timestampValid ? parsedTs.toISOString() : new Date().toISOString(),
            messageType: payload.messageType || payload.MessageType || 'text',
            mediaUri: payload.fileUrl || payload.file_url,
            fileUrl: payload.fileUrl || payload.file_url,
            replyTo: payload.replyTo || payload.ReplyTo,
            reactions: payload.reactions || payload.Reactions || {},
            readBy: payload.readBy || payload.ReadBy || [],
            isMine: String(payload.userId || payload.user_id) === String(currentUserId),
          };

          setMessages((prev) => {
            const tempId = payload.clientTempId || payload.clientTempID;
            if (tempId) {
              const idx = prev.findIndex((m) => m.id === tempId || m.tempId === tempId);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = newMessage;
                return copy;
              }
            }

            if (newMessage.id && prev.find((m) => String(m.id) === String(newMessage.id))) {
              return prev;
            }

            const combined = [...prev, newMessage];
            combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return combined;
          });

          setTimeout(() => scrollToBottom(), 100);
        });

        // Listen for read receipts
        signalRService.onMessageRead((data) => {
          if (!mounted) return;
          console.log('[SignalR] MessageRead:', data);

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                const newReadBy = [...(msg.readBy || [])];
                if (!newReadBy.find((r) => String(r.userId) === String(data.userId))) {
                  newReadBy.push({ userId: data.userId, readAt: data.readAt });
                }
                return { ...msg, readBy: newReadBy };
              }
              return msg;
            })
          );

          setLastReadMap((prev) => {
            const copy = { ...prev };
            const uid = String(data.userId);
            const existing = copy[uid];
            if (!existing || Number(data.messageId) >= Number(existing.messageId)) {
              copy[uid] = { messageId: data.messageId, readAt: data.readAt || new Date().toISOString() };
            }
            return copy;
          });
        });

        // Listen for reactions
        signalRService.onReactionAdded((data) => {
          if (!mounted) return;
          console.log('[SignalR] ReactionAdded:', data);

          setMessages((prev) =>
            prev.map((msg) => (msg.id === data.messageId ? { ...msg, reactions: data.reactions || {} } : msg))
          );
        });

        signalRService.onReactionRemoved((data) => {
          if (!mounted) return;
          console.log('[SignalR] ReactionRemoved:', data);

          setMessages((prev) =>
            prev.map((msg) => (msg.id === data.messageId ? { ...msg, reactions: data.reactions || {} } : msg))
          );
        });

        // Listen for typing indicators
        signalRService.onUserTyping((data) => {
          if (!mounted) return;
          if (String(data.conversationId) !== String(conversationId)) return;
          if (String(data.userId) === String(currentUserId)) return;

          setTypingUsers((prev) => {
            if (prev.find((u) => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, userName: data.userName }];
          });

          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          }, 3000);
        });

        console.log('[GroupChat] SignalR setup complete');
      } catch (error) {
        console.error('[GroupChat] SignalR setup error:', error);
      }
    };

    setupSignalR();

    return () => {
      mounted = false;
      console.log('[GroupChat] Cleaning up SignalR...');
      signalRService.leaveGroup(conversationId).catch((err) => console.error('Error leaving group:', err));
    };
  }, [conversationId, currentUserId]);

  // Auto-mark messages as read
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    const timer = setTimeout(() => {
      const unreadMessages = messages.filter((msg) => {
        if (msg.isMine) return false;

        let readBy = [];
        try {
          readBy = Array.isArray(msg.readBy) ? msg.readBy : JSON.parse(msg.readBy || '[]');
        } catch {
          readBy = [];
        }

        return !readBy.some((r) => Number(r.user_id || r.userId || r) === Number(currentUserId));
      });

      const idsToMark = unreadMessages.map((m) => m.id).filter(Boolean);
      if (idsToMark.length === 0) return;

      (async () => {
        try {
          if (signalRService?.chatConnection?.state === 1) {
            await signalRService.markMessagesAsRead(conversationId, idsToMark);
            console.log('[GroupChat] Marked messages as read:', idsToMark);

            const maxId = Math.max(...idsToMark.map((id) => Number(id)).filter((n) => !isNaN(n)));
            if (maxId > 0 && currentUserId) {
              setLastReadMap((prev) => ({
                ...prev,
                [String(currentUserId)]: { messageId: String(maxId), readAt: new Date().toISOString() },
              }));
            }
          }
        } catch (error) {
          console.error('[GroupChat] Error marking messages as read:', error);
        }
      })();
    }, 1000);

    return () => clearTimeout(timer);
  }, [messages, currentUserId, conversationId]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroupData = async () => {
    try {
      setLoading(true);

      // Get current user ID
      const userStr = localStorage.getItem('user') || localStorage.getItem('userInfo');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userId = user.user_id || user.userId;
        setCurrentUserId(userId);
        console.log('[GroupChat] Current userId:', userId);
      }

      // Load group info and members
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);

      setGroupInfo(groupData);
      setMembers(membersData);

      console.log('[GroupChat] Members loaded:', membersData.length);

      // Load messages
      await loadMessages();
    } catch (error) {
      console.error('Load group data error:', error);
      alert('Không thể tải dữ liệu nhóm');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/GroupMessages/group/${conversationId}?page=${pageNum}&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const newMessages = (data.messages || data || []).map((msg) => ({
        id: msg.id || msg.messageId,
        userId: msg.userId || msg.user_id,
        userName: msg.userName || msg.user_name,
        userAvatar: msg.userAvatar || msg.user_avatar,
        message: msg.content || msg.message,
        timestamp: msg.timestamp || msg.createdAt || msg.created_at,
        messageType: msg.messageType || msg.MessageType || 'text',
        mediaUri: msg.fileUrl || msg.file_url,
        fileUrl: msg.fileUrl || msg.file_url,
        replyTo: msg.replyTo || msg.ReplyTo,
        reactions: msg.reactions || msg.Reactions || {},
        readBy: msg.readBy || msg.ReadBy || [],
        isMine: String(msg.userId || msg.user_id) === String(currentUserId),
      }));

      if (pageNum === 1) {
        setMessages(newMessages);
      } else {
        setMessages((prev) => [...newMessages, ...prev]);
      }

      setHasMore(newMessages.length === 50);
      setPage(pageNum);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSend = async (mediaUri = null, mediaType = 'text') => {
    const content = message.trim();
    if (!content && !mediaUri) return;

    const tempId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      tempId,
      userId: currentUserId,
      userName: 'You',
      userAvatar: localStorage.getItem('userAvatar'),
      message: content,
      timestamp: new Date().toISOString(),
      messageType: mediaType,
      mediaUri: mediaUri,
      fileUrl: mediaUri,
      replyTo: replyingTo?.id || null,
      reactions: {},
      readBy: [],
      isMine: true,
      pending: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessage('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('content', content);
      formData.append('messageType', mediaType);
      if (replyingTo) formData.append('replyTo', replyingTo.id);
      if (mediaUri) {
        // For web file uploads, mediaUri will be a File object
        if (mediaUri instanceof File) {
          formData.append('file', mediaUri);
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/GroupMessages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send message');

      const result = await response.json();

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...result, isMine: true } : m))
      );
    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Không thể gửi tin nhắn');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('File quá lớn. Giới hạn 100MB');
      return;
    }

    const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    await handleSend(file, mediaType);
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/GroupMessages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) throw new Error('Failed to add reaction');

      const result = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: result.reactions } : m))
      );
    } catch (error) {
      console.error('Add reaction error:', error);
    }
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setSelectedMessage(msg);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCopyMessage = () => {
    if (selectedMessage?.message) {
      navigator.clipboard.writeText(selectedMessage.message);
    }
    setShowContextMenu(false);
  };

  const handleReplyMessage = () => {
    setReplyingTo(selectedMessage);
    setShowContextMenu(false);
    messageInputRef.current?.focus();
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/GroupMessages/${selectedMessage.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete message');

      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
    } catch (error) {
      console.error('Delete message error:', error);
      alert('Không thể xóa tin nhắn');
    }

    setShowContextMenu(false);
  };

  const handleImageClick = (msg) => {
    const imageMessages = messages.filter((m) => m.messageType === 'image' && m.mediaUri);
    const index = imageMessages.findIndex((m) => m.id === msg.id);
    setSelectedImages(imageMessages.map((m) => getMediaUri(m.mediaUri)));
    setSelectedImageIndex(index >= 0 ? index : 0);
    setShowImageViewer(true);
  };

  const getMentionableMembers = () => {
    return members.filter(
      (m) => String(m.userId) !== String(currentUserId) &&
        (m.username?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
          m.fullName?.toLowerCase().includes(mentionSearch.toLowerCase()))
    );
  };

  const handleMentionSelect = (member) => {
    const beforeMention = message.substring(0, mentionStartIndex);
    const afterMention = message.substring(messageInputRef.current.selectionStart);
    const newMessage = `${beforeMention}@${member.username} ${afterMention}`;
    setMessage(newMessage);
    setShowMentionList(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
    messageInputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && cursorPos - lastAtIndex <= 20) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      if (!searchText.includes(' ')) {
        setShowMentionList(true);
        setMentionSearch(searchText);
        setMentionStartIndex(lastAtIndex);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }

    // Send typing indicator
    if (signalRService?.chatConnection?.state === 1) {
      signalRService.sendTypingIndicator(conversationId);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Click outside context menu to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu]);

  if (loading) {
    return (
      <div className="group-chat-loading">
        <div className="spinner"></div>
        <p>Đang tải tin nhắn...</p>
      </div>
    );
  }

  return (
    <div className="group-chat-container">
      {/* Header */}
      <div className="group-chat-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <img
          className="group-avatar"
          src={getMediaUri(groupInfo?.avatarUrl) || '/default-group.png'}
          alt={groupInfo?.name}
        />
        <div className="group-info">
          <h3 className="group-name">{groupInfo?.name || groupName}</h3>
          <p className="members-count">{members.length} thành viên</p>
        </div>
        <button className="info-button" onClick={() => navigate(`/messenger/group/${conversationId}/details`)}>
          ℹ️
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container" ref={messagesContainerRef}>
        {loadingMore && (
          <div className="loading-more">
            <div className="spinner-small"></div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-item ${msg.isMine ? 'mine' : 'theirs'} ${
              msg.id === highlightedMessageId ? 'highlighted' : ''
            }`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            {!msg.isMine && (
              <img
                className="message-avatar"
                src={getMediaUri(msg.userAvatar) || '/default-avatar.png'}
                alt={msg.userName}
              />
            )}

            <div className="message-content">
              {!msg.isMine && <p className="message-sender">{msg.userName}</p>}

              {msg.replyTo && (
                <div className="reply-preview">
                  <p className="reply-label">Trả lời tin nhắn</p>
                </div>
              )}

              {msg.messageType === 'text' && (
                <div className={`message-bubble ${isEmojiOnly(msg.message) ? 'emoji-only' : ''}`}>
                  {msg.message}
                  {msg.pending && <span className="pending-indicator">⏳</span>}
                </div>
              )}

              {msg.messageType === 'image' && (
                <div className="message-media" onClick={() => handleImageClick(msg)}>
                  <img src={getMediaUri(msg.mediaUri)} alt="Message" />
                  {msg.pending && <span className="pending-indicator">⏳</span>}
                </div>
              )}

              {msg.messageType === 'video' && (
                <div className="message-media">
                  <video controls src={getMediaUri(msg.mediaUri)} />
                  {msg.pending && <span className="pending-indicator">⏳</span>}
                </div>
              )}

              {msg.messageType === 'file' && (
                <div className="message-file">
                  <span>📎 File đính kèm</span>
                  <a href={getMediaUri(msg.mediaUri)} target="_blank" rel="noopener noreferrer">
                    Tải xuống
                  </a>
                </div>
              )}

              <div className="message-footer">
                <span className="message-time">{formatTime(msg.timestamp)}</span>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="message-reactions">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span
                        key={emoji}
                        className="reaction-item"
                        onClick={() => handleReaction(msg.id, emoji)}
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick reactions */}
            <div className="quick-reactions">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <span className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="typing-text">
            {typingUsers.map((u) => u.userName).join(', ')} đang nhập...
          </span>
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="replying-to-preview">
          <p>Đang trả lời: {replyingTo.message}</p>
          <button onClick={() => setReplyingTo(null)}>✕</button>
        </div>
      )}

      {/* Mention list */}
      {showMentionList && (
        <div className="mention-list">
          {getMentionableMembers().map((member) => (
            <div key={member.userId} className="mention-item" onClick={() => handleMentionSelect(member)}>
              <img src={getMediaUri(member.avatarUrl) || '/default-avatar.png'} alt={member.username} />
              <div>
                <p className="mention-name">{member.fullName || member.username}</p>
                <p className="mention-username">@{member.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {EMOJI_LIST.map((emoji) => (
            <button key={emoji} onClick={() => setMessage((prev) => prev + emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="input-container">
        <button className="attachment-button" onClick={() => fileInputRef.current?.click()}>
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
        />

        <textarea
          ref={messageInputRef}
          className="message-input"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
        />

        <button className="emoji-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          😊
        </button>

        <button className="send-button" onClick={() => handleSend()} disabled={!message.trim()}>
          ➤
        </button>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
        >
          <button onClick={handleReplyMessage}>Trả lời</button>
          <button onClick={handleCopyMessage}>Sao chép</button>
          {selectedMessage?.isMine && (
            <button onClick={handleDeleteMessage} className="delete-option">
              Xóa
            </button>
          )}
        </div>
      )}

      {/* Image viewer */}
      {showImageViewer && (
        <ImageViewer
          images={selectedImages}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}
